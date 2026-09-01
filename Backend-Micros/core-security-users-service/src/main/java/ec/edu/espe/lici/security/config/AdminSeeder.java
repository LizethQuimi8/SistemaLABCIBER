package ec.edu.espe.lici.security.config;

import ec.edu.espe.lici.security.domain.Rol;
import ec.edu.espe.lici.security.domain.Usuario;
import ec.edu.espe.lici.security.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Crea un usuario Administrador inicial si la tabla de usuarios esta vacia,
 * para poder autenticarse la primera vez que se levanta el servicio.
 */
@Component
public class AdminSeeder implements CommandLineRunner {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final String adminEmail;
    private final String adminPassword;

    public AdminSeeder(UsuarioRepository usuarioRepository,
                        PasswordEncoder passwordEncoder,
                        @Value("${lici.admin-seed.email}") String adminEmail,
                        @Value("${lici.admin-seed.password}") String adminPassword) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.adminEmail = adminEmail;
        this.adminPassword = adminPassword;
    }

    @Override
    public void run(String... args) {
        if (usuarioRepository.count() == 0) {
            Usuario admin = Usuario.builder()
                    .nombres("Administrador")
                    .apellidos("LICI")
                    .email(adminEmail)
                    .passwordHash(passwordEncoder.encode(adminPassword))
                    .rol(Rol.ADMINISTRADOR)
                    .activo(true)
                    .build();
            usuarioRepository.save(admin);
        }
    }
}
