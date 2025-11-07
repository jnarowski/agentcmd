# Security Policy

## Supported Versions

We release patches for security vulnerabilities. Currently, the following versions are being supported with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |

## Reporting a Vulnerability

The Agent Workflows team takes security bugs seriously. We appreciate your efforts to responsibly disclose your findings, and will make every effort to acknowledge your contributions.

### How to Report a Security Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report security vulnerabilities by:

1. **Opening a GitHub Security Advisory**: Go to the [Security tab](https://github.com/sourceborn/agent-workflows-monorepo/security/advisories) and click "Report a vulnerability"

2. **Via Email**: Send details to the project maintainers at the email listed in the repository owner's GitHub profile

Please include the following information in your report:

- Type of vulnerability
- Full paths of affected source files
- Location of the affected source code (tag/branch/commit or direct URL)
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it

### What to Expect

When you report a vulnerability, you can expect:

- **Acknowledgment**: We will acknowledge receipt of your vulnerability report within 72 hours
- **Communication**: We will keep you informed about the progress of fixing the vulnerability
- **Timeline**: We aim to resolve critical vulnerabilities within 90 days
- **Credit**: We will credit you in the release notes when the vulnerability is disclosed (unless you prefer to remain anonymous)

## Security Best Practices for Users

### Environment Variables

- Never commit `.env` files or API keys to version control
- Use strong, randomly generated values for `JWT_SECRET`
- Rotate API keys regularly
- Use `.env.example` as a template (never contains real secrets)

### Database Security

- Use strong passwords for database connections
- Enable SSL/TLS for database connections in production
- Regularly backup your database
- Keep SQLite file permissions restrictive (600 or 640)

### Web Application Security

- Always use HTTPS in production
- Configure CORS properly (restrict `ALLOWED_ORIGINS`)
- Use strong JWT secrets (minimum 32 bytes)
- Enable rate limiting for API endpoints
- Keep Node.js and dependencies up to date

### Input Validation

- All user inputs are validated using Zod schemas
- Path traversal protection is enforced
- SQL injection protection via Prisma ORM

### Authentication

- JWT tokens are used for authentication
- Passwords are hashed using bcrypt
- Sessions can be invalidated by logging out

### Dependency Security

We regularly update dependencies to patch security vulnerabilities. To check for known vulnerabilities:

```bash
pnpm audit
```

## Security Updates

Security updates will be released as patch versions. Subscribe to releases on GitHub to be notified:

https://github.com/sourceborn/agent-workflows-monorepo/releases

## Known Security Considerations

### Single-User Design

This application is designed for **single-user deployment** (personal use, single machine). If you plan to deploy this in a multi-user environment, please be aware:

- JWT tokens have no expiration by default
- No role-based access control (RBAC)
- Minimal authentication flow

For multi-user deployments, additional security measures are required.

### Local File Access

The application has broad file system access to support code editing features. Deploy in sandboxed environments or use proper OS-level permissions to restrict access.

### CLI Tool Integration

The application executes external CLI tools (Claude, Codex). Ensure:
- CLI tools are from trusted sources
- CLI tools are kept up to date
- Input to CLI tools is properly validated

## Disclosure Policy

When we receive a security bug report, we will:

1. Confirm the problem and determine affected versions
2. Audit code to find similar problems
3. Prepare fixes for all supported versions
4. Release new versions as soon as possible

After a security fix is released, we will:
- Publish a security advisory on GitHub
- Update the CHANGELOG
- Credit the reporter (if they wish to be credited)

## Comments on This Policy

If you have suggestions on how this process could be improved, please submit a pull request or open an issue.
