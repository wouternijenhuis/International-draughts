using '../main.bicep'

param environment = 'prod'
param namePrefix = 'draughts'
param dbAdminPassword = readEnvironmentVariable('DB_ADMIN_PASSWORD', '')
