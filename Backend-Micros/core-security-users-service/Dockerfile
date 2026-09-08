# Build context esperado: Backend-Micros/ (raiz del reactor Maven)
# docker build -f core-security-users-service/Dockerfile .
FROM maven:3.9.9-eclipse-temurin-17 AS build
WORKDIR /app

COPY pom.xml .
COPY core-security-users-service/pom.xml core-security-users-service/pom.xml
COPY core-academic-research-service/pom.xml core-academic-research-service/pom.xml
COPY document-workflow-service/pom.xml document-workflow-service/pom.xml
COPY administrative-logistics-service/pom.xml administrative-logistics-service/pom.xml
COPY reporting-service/pom.xml reporting-service/pom.xml
COPY api-gateway/pom.xml api-gateway/pom.xml
RUN mvn -q -pl core-security-users-service -am dependency:go-offline || true

COPY core-security-users-service/src core-security-users-service/src
RUN mvn -q -pl core-security-users-service -am package -DskipTests

FROM eclipse-temurin:17-jre-alpine
RUN addgroup -S spring && adduser -S spring -G spring
WORKDIR /app
COPY --from=build /app/core-security-users-service/target/core-security-users-service.jar app.jar
USER spring:spring
EXPOSE 8081
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
