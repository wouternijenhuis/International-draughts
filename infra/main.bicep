@description('The environment name (dev, staging, prod)')
param environment string = 'dev'

@description('The Azure region for resources')
param location string = resourceGroup().location

@description('The name prefix for all resources')
param namePrefix string = 'draughts'

var uniqueSuffix = uniqueString(resourceGroup().id)
var baseName = '${namePrefix}-${environment}-${uniqueSuffix}'

// App Service Plan
resource appServicePlan 'Microsoft.Web/serverfarms@2024-04-01' = {
  name: '${baseName}-plan'
  location: location
  sku: {
    name: environment == 'prod' ? 'P1v3' : 'B1'
    tier: environment == 'prod' ? 'PremiumV3' : 'Basic'
  }
  kind: 'linux'
  properties: {
    reserved: true
  }
}

// Backend App Service
resource backendApp 'Microsoft.Web/sites@2024-04-01' = {
  name: '${baseName}-api'
  location: location
  kind: 'app,linux,container'
  properties: {
    serverFarmId: appServicePlan.id
    siteConfig: {
      linuxFxVersion: 'DOCKER|${baseName}.azurecr.io/draughts-api:latest'
      alwaysOn: environment == 'prod'
      healthCheckPath: '/health'
      cors: {
        allowedOrigins: [
          'https://${baseName}-web.azurestaticapps.net'
        ]
      }
      appSettings: [
        {
          name: 'ASPNETCORE_ENVIRONMENT'
          value: environment == 'prod' ? 'Production' : 'Development'
        }
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: appInsights.properties.ConnectionString
        }
        {
          name: 'ConnectionStrings__DefaultConnection'
          value: 'Host=${postgresServer.properties.fullyQualifiedDomainName};Database=draughts;Username=draughtsadmin;Password=REPLACE_WITH_KEYVAULT_REFERENCE'
        }
      ]
    }
    httpsOnly: true
  }
}

// Static Web App for Frontend
resource staticWebApp 'Microsoft.Web/staticSites@2024-04-01' = {
  name: '${baseName}-web'
  location: location
  sku: {
    name: environment == 'prod' ? 'Standard' : 'Free'
    tier: environment == 'prod' ? 'Standard' : 'Free'
  }
  properties: {}
}

// Application Insights
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: '${baseName}-insights'
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
  }
}

// Log Analytics Workspace
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: '${baseName}-logs'
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

// PostgreSQL Flexible Server
resource postgresServer 'Microsoft.DBforPostgreSQL/flexibleServers@2024-08-01' = {
  name: '${baseName}-db'
  location: location
  sku: {
    name: environment == 'prod' ? 'Standard_D2ds_v4' : 'Standard_B1ms'
    tier: environment == 'prod' ? 'GeneralPurpose' : 'Burstable'
  }
  properties: {
    version: '17'
    storage: {
      storageSizeGB: environment == 'prod' ? 64 : 32
    }
    backup: {
      backupRetentionDays: environment == 'prod' ? 35 : 7
      geoRedundantBackup: environment == 'prod' ? 'Enabled' : 'Disabled'
    }
    highAvailability: {
      mode: environment == 'prod' ? 'ZoneRedundant' : 'Disabled'
    }
  }
}

// Auto-scaling (production only)
resource autoScale 'Microsoft.Insights/autoscalesettings@2022-10-01' = if (environment == 'prod') {
  name: '${baseName}-autoscale'
  location: location
  properties: {
    enabled: true
    targetResourceUri: appServicePlan.id
    profiles: [
      {
        name: 'default'
        capacity: {
          minimum: '2'
          maximum: '10'
          default: '2'
        }
        rules: [
          {
            metricTrigger: {
              metricName: 'CpuPercentage'
              metricResourceUri: appServicePlan.id
              operator: 'GreaterThan'
              threshold: 70
              timeAggregation: 'Average'
              timeWindow: 'PT5M'
              timeGrain: 'PT1M'
              statistic: 'Average'
            }
            scaleAction: {
              direction: 'Increase'
              type: 'ChangeCount'
              value: '1'
              cooldown: 'PT5M'
            }
          }
          {
            metricTrigger: {
              metricName: 'CpuPercentage'
              metricResourceUri: appServicePlan.id
              operator: 'LessThan'
              threshold: 30
              timeAggregation: 'Average'
              timeWindow: 'PT5M'
              timeGrain: 'PT1M'
              statistic: 'Average'
            }
            scaleAction: {
              direction: 'Decrease'
              type: 'ChangeCount'
              value: '1'
              cooldown: 'PT5M'
            }
          }
        ]
      }
    ]
  }
}

// Alert rules
resource errorRateAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: '${baseName}-error-rate'
  location: 'global'
  properties: {
    severity: 2
    enabled: true
    scopes: [backendApp.id]
    evaluationFrequency: 'PT5M'
    windowSize: 'PT15M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'Http5xx'
          metricName: 'Http5xx'
          operator: 'GreaterThan'
          threshold: 10
          timeAggregation: 'Total'
          criterionType: 'StaticThresholdCriterion'
        }
      ]
    }
  }
}

// Outputs
output backendUrl string = 'https://${backendApp.properties.defaultHostName}'
output frontendUrl string = 'https://${staticWebApp.properties.defaultHostname}'
output postgresHost string = postgresServer.properties.fullyQualifiedDomainName
output appInsightsConnectionString string = appInsights.properties.ConnectionString
output appInsightsKey string = appInsights.properties.InstrumentationKey

// Key Vault
resource keyVault 'Microsoft.KeyVault/vaults@2024-04-01-preview' = {
  name: '${baseName}-kv'
  location: location
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
    accessPolicies: []
    enableSoftDelete: true
    softDeleteRetentionInDays: 90
  }
}
