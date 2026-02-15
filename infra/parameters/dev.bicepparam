using '../main.bicep'

param environment = 'dev'
param namePrefix = 'draughts'
param customDomainFrontend = 'dammen.devdad.net'
param dbAdminPassword = readEnvironmentVariable('DB_ADMIN_PASSWORD', 'ChangeMeInProduction123!')
