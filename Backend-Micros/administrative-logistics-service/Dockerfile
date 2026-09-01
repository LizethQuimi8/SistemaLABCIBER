# Build context esperado: Backend-Micros/ (raiz del reactor Maven)
# docker build -f administrative-logistics-service/Dockerfile .
FROM maven:3.9.9-eclipse-temurin-17 AS build
WORKDIR /app

COPY pom.xml .
COPY core-security-users-service/pom.xml core-security-users-service/pom.xml
COPY core-academic-research-service/pom.xml core-academic-research-service/pom.xml
COPY document-workflow-service/pom.xml document-workflow-service/pom.xml
COPY administrative-logistics-service/pom.xml administrative-logistics-service/pom.xml
COPY reporting-service/pom.xml reporting-service/pom.xml
COPY api-gateway/pom.xml api-gateway/pom.xml
RUN mvn -q -pl administrative-logistics-service -am dependency:go-offline || true

COPY administrative-logistics-service/src administrative-logistics-service/src
RUN mvn -q -pl administrative-logistics-service -am package -DskipTests

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/administrative-logistics-service/target/administrative-logistics-service.jar app.jar
EXPOSE 8084
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
