# Security Policy

## Supported versions

| Version | Supported |
|---------|-----------|
| 2.5.x   | Yes       |
| < 2.5   | No        |

Security fixes are applied to the latest release on the `main` branch.

## Reporting a vulnerability

**Please do not open public GitHub issues for security vulnerabilities.**

Instead:

1. Email the maintainers at **mohammad161186@gmail.com**
   — or use [GitHub Private Vulnerability Reporting](https://github.com/Satan2049/that-gpt/security/advisories/new) if enabled.
2. Include:
   - Description of the issue and impact
   - Steps to reproduce
   - Affected version(s)
   - Proof of concept if available

We aim to acknowledge reports within **72 hours** and provide a fix timeline when possible.

## Threat model

ThatGPT is a **local-first single-user desktop app**:

- No built-in authentication or multi-user access control
- API keys are stored in a local `.env` file in the app data directory
- Chat history is stored as JSON on disk
- The app proxies requests to user-configured OpenAI-compatible APIs over HTTPS

### In scope

- Credential exposure via IPC, logs, or UI
- Path traversal or unsafe file operations in Rust repositories
- Injection via unsanitized inputs sent to the model API
- Insecure defaults for TLS or provider requests
- Supply-chain issues in release artifacts (tampered binaries)

### Out of scope

- Compromise of the user's machine outside the app
- Attacks requiring physical access to an unlocked PC
- Misconfiguration of third-party API keys or provider endpoints
- Social engineering

## User recommendations

- Keep `AI_API_KEY` only in `%APPDATA%\com.thatgpt.desktop\.env` — never in the repo or chat exports
- Verify release downloads using [docs/TRUST.md](docs/TRUST.md)
- Prefer building from source for maximum assurance
- Do not run unsigned binaries from untrusted mirrors

## Disclosure policy

When a fix is available:

1. Patch is released and tagged
2. Advisory is published with credit to the reporter (unless anonymity is requested)
3. `SHA256.txt` is regenerated for the new release

Thank you for helping keep ThatGPT secure.
