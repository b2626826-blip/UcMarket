FROM eclipse-temurin:21-jre-jammy

RUN groupadd --system ucmarket \
    && useradd --system --gid ucmarket --home-dir /app --shell /usr/sbin/nologin ucmarket

WORKDIR /app
COPY backend/target/backend-*.jar app.jar

USER ucmarket
EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
