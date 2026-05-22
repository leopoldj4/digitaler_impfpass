# Digitaler Impfpass

## Demo Login

The `impfpass-app` now starts behind a demo login with a second-factor check.

- Email: `doctor@example.com`
- Password: `ChangeMe!234`
- 2FA code: `123456`

The code is exposed in the UI for development only. For production, replace the
in-memory demo auth in `impfpass-app/backend/app/auth.py` with persisted users,
per-user password hashes, real MFA enrollment, and a delivery/verification
mechanism such as TOTP or WebAuthn.
