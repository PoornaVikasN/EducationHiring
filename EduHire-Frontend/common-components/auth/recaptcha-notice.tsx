export function RecaptchaNotice() {
  return (
    <p className="text-[11px] leading-relaxed text-text-muted text-center">
      This site is protected by reCAPTCHA and the Google{' '}
      <a
        href="https://policies.google.com/privacy"
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:text-text-primary"
      >
        Privacy Policy
      </a>{' '}
      and{' '}
      <a
        href="https://policies.google.com/terms"
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:text-text-primary"
      >
        Terms of Service
      </a>{' '}
      apply.
    </p>
  );
}
