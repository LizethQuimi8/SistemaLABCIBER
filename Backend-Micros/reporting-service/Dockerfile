# Build context esperado: Backend-Micros/ (raiz del reactor Maven)
# docker build -f reporting-service/Dockerfile .
FROM maven:3.9.9-eclipse-temurin-17 AS build
WORKDIR /app

COPY pom.xml .
COPY core-security-users-service/pom.xml core-security-users-service/pom.xml
COPY core-academic-research-service/pom.xml core-academic-research-service/pom.xml
COPY document-workflow-service/pom.xml document-workflow-service/pom.xml
COPY administrative-logistics-service/pom.xml administrative-logistics-service/pom.xml
COPY reporting-service/pom.xml reporting-service/pom.xml
COPY api-gateway/pom.xml api-gateway/pom.xml
RUN mvn -q -pl reporting-service -am dependency:go-offline || true

COPY reporting-service/src reporting-service/src
RUN mvn -q -pl reporting-service -am package -DskipTests

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/reporting-service/target/reporting-service.jar app.jar
EXPOSE 8085
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
