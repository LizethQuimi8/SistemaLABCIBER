package ec.edu.espe.lici.document.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.web.SecurityFilterChain;

import java.util.Collection;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public JwtDecoder jwtDecoder(@Value("${lici.security.jwk-set-uri}") String jwkSetUri) {
        return NimbusJwtDecoder.withJwkSetUri(jwkSetUri).build();
    }

    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtGrantedAuthoritiesConverter authoritiesConverter = new JwtGrantedAuthoritiesConverter();
        authoritiesConverter.setAuthorityPrefix("ROLE_");
        authoritiesConverter.setAuthoritiesClaimName("roles");

        Converter<Jwt, Collection<GrantedAuthority>> converter = authoritiesConverter::convert;

        JwtAuthenticationConverter jwtAuthenticationConverter = new JwtAuthenticationConverter();
        jwtAuthenticationConverter.setJwtGrantedAuthoritiesConverter(converter);
        return jwtAuthenticationConverter;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http, JwtAuthenticationConverter jwtAuthenticationConverter) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/actuator/health").permitAll()
                        // El rol ESTUDIANTE no tiene acceso a Documentos y Correspondencia,
                        // Manuales y Procesos ni Notificaciones (ver tambien el menu lateral
                        // del frontend); el resto de modulos de este servicio (planificacion
                        // estrategica, practicas/ensayos, cyberrange) si son visibles para el.
                        .requestMatchers("/api/documentos/**")
                            .hasAnyRole("ADMINISTRADOR", "DOCENTE_INVESTIGADOR", "INVESTIGADOR_COLABORADOR", "ADMIN_INFRAESTRUCTURA", "RESPONSABLE_COMPRAS")
                        .requestMatchers("/api/manuales/**")
                            .hasAnyRole("ADMINISTRADOR", "DOCENTE_INVESTIGADOR", "INVESTIGADOR_COLABORADOR", "ADMIN_INFRAESTRUCTURA", "RESPONSABLE_COMPRAS")
                        .requestMatchers("/api/notificaciones/**")
                            .hasAnyRole("ADMINISTRADOR", "DOCENTE_INVESTIGADOR", "INVESTIGADOR_COLABORADOR", "ADMIN_INFRAESTRUCTURA", "RESPONSABLE_COMPRAS")
                        .anyRequest().authenticated())
                .oauth2ResourceServer(oauth2 -> oauth2
                        .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter)));
        return http.build();
    }
}
