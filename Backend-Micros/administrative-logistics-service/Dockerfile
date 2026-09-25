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
RUN addgroup -S spring && adduser -S spring -G spring
WORKDIR /app
COPY --from=build /app/administrative-logistics-service/target/administrative-logistics-service.jar app.jar
# Pre-crear el directorio de almacenamiento con el dueno correcto: al montar
# un volumen nombrado vacio aqui, Docker copia este contenido (y permisos)
# como semilla, evitando que quede en manos de root y bloquee la escritura
# del proceso (que corre como spring, no root).
RUN mkdir -p /data/compras && chown -R spring:spring /data
USER spring:spring
EXPOSE 8084
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
