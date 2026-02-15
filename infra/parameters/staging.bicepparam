using '../main.bicep'

param environment = 'staging'
param namePrefix = 'draughts'
param dbAdminPassword = readEnvironmentVariable('DB_ADMIN_PASSWORD', '')
