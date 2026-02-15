using '../main.bicep'

param environment = 'dev'
param namePrefix = 'draughts'
param dbAdminPassword = readEnvironmentVariable('DB_ADMIN_PASSWORD', 'ChangeMeInProduction123!')
