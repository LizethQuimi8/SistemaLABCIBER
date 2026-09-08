# Build context esperado: Backend-Micros/ (raiz del reactor Maven)
# docker build -f core-academic-research-service/Dockerfile .
FROM maven:3.9.9-eclipse-temurin-17 AS build
WORKDIR /app

COPY pom.xml .
COPY common-security/pom.xml common-security/pom.xml
COPY core-security-users-service/pom.xml core-security-users-service/pom.xml
COPY core-academic-research-service/pom.xml core-academic-research-service/pom.xml
COPY document-workflow-service/pom.xml document-workflow-service/pom.xml
COPY administrative-logistics-service/pom.xml administrative-logistics-service/pom.xml
COPY reporting-service/pom.xml reporting-service/pom.xml
COPY api-gateway/pom.xml api-gateway/pom.xml
RUN mvn -q -pl core-academic-research-service -am dependency:go-offline || true

COPY common-security/src common-security/src
COPY core-academic-research-service/src core-academic-research-service/src
RUN mvn -q -pl core-academic-research-service -am package -DskipTests

FROM eclipse-temurin:17-jre-alpine
RUN addgroup -S spring && adduser -S spring -G spring
WORKDIR /app
COPY --from=build /app/core-academic-research-service/target/core-academic-research-service.jar app.jar
USER spring:spring
EXPOSE 8082
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
