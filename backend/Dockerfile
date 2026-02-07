# ===== Build Stage =====
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy csproj files for layer caching
COPY src/InternationalDraughts.Domain/*.csproj src/InternationalDraughts.Domain/
COPY src/InternationalDraughts.Application/*.csproj src/InternationalDraughts.Application/
COPY src/InternationalDraughts.Infrastructure/*.csproj src/InternationalDraughts.Infrastructure/
COPY src/InternationalDraughts.Api/*.csproj src/InternationalDraughts.Api/
RUN dotnet restore src/InternationalDraughts.Api/InternationalDraughts.Api.csproj

# Copy everything else and build
COPY . .
RUN dotnet publish src/InternationalDraughts.Api/InternationalDraughts.Api.csproj \
    -c Release -o /app/publish --no-restore

# ===== Runtime Stage =====
FROM mcr.microsoft.com/dotnet/aspnet:10.0-alpine AS runtime
WORKDIR /app

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=build /app/publish .

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

USER appuser
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

ENTRYPOINT ["dotnet", "InternationalDraughts.Api.dll"]
