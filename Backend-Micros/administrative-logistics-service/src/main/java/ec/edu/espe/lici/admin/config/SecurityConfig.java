package ec.edu.espe.lici.admin.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.http.HttpMethod;
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

/**
 * Reglas de rol de la seccion 8 de la documentacion:
 * Inventario -> Administrador y Admin. Infraestructura CRUD completo, el resto
 * (Docente, Responsable Compras) solo lectura.
 * Prestamos -> los 4 roles pueden solicitar/ver; aprobar es de Administrador y
 * Admin. Infraestructura, rechazar es exclusivo de Administrador (verificado
 * en PrestamoController).
 * Compras Publicas -> Administrador y Responsable Compras CRUD completo, el
 * resto (Docente, Admin. Infraestructura) solo lectura.
 */
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
                        .requestMatchers(HttpMethod.GET, "/api/inventario/**")
                            .hasAnyRole("ADMINISTRADOR", "DOCENTE_INVESTIGADOR", "ADMIN_INFRAESTRUCTURA", "RESPONSABLE_COMPRAS")
                        .requestMatchers("/api/inventario/**").hasAnyRole("ADMINISTRADOR", "ADMIN_INFRAESTRUCTURA")
                        .requestMatchers("/api/prestamos/**")
                            .hasAnyRole("ADMINISTRADOR", "DOCENTE_INVESTIGADOR", "ADMIN_INFRAESTRUCTURA", "RESPONSABLE_COMPRAS")
                        .requestMatchers(HttpMethod.GET, "/api/compras/**")
                            .hasAnyRole("ADMINISTRADOR", "DOCENTE_INVESTIGADOR", "ADMIN_INFRAESTRUCTURA", "RESPONSABLE_COMPRAS")
                        .requestMatchers("/api/compras/**").hasAnyRole("ADMINISTRADOR", "RESPONSABLE_COMPRAS")
                        .anyRequest().authenticated())
                .oauth2ResourceServer(oauth2 -> oauth2
                        .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter)));
        return http.build();
    }
}
