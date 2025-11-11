import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface PasswordResetEmailProps {
  resetLink: string
  userEmail: string
}

export const PasswordResetEmail = ({
  resetLink,
  userEmail,
}: PasswordResetEmailProps) => (
  <Html>
    <Head />
    <Preview>Reset your OurSafeBase password</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Img
            src="https://oursafebase.com/logo.png"
            width="150"
            height="auto"
            alt="OurSafeBase"
            style={logo}
          />
        </Section>
        
        <Heading style={h1}>Reset Your Password</Heading>
        
        <Text style={text}>
          Hello,
        </Text>
        
        <Text style={text}>
          You recently requested to reset your password for your OurSafeBase account ({userEmail}). 
          Click the button below to securely reset your password.
        </Text>
        
        <Section style={buttonContainer}>
          <Link
            href={resetLink}
            target="_blank"
            style={button}
          >
            Reset Password Securely
          </Link>
        </Section>
        
        <Text style={text}>
          Or copy and paste this link into your browser:
        </Text>
        
        <Text style={linkText}>
          {resetLink}
        </Text>
        
        <Text style={noteText}>
          This password reset link will expire in 1 hour for security reasons.
        </Text>
        
        <Text style={noteText}>
          If you didn't request a password reset, you can safely ignore this email. 
          Your password will remain unchanged.
        </Text>
        
        <Section style={divider} />
        
        <Text style={footer}>
          <strong>OurSafeBase</strong> - Creating safer event experiences
          <br />
          <Link
            href="https://oursafebase.com"
            target="_blank"
            style={footerLink}
          >
            Visit our website
          </Link>
          {' • '}
          <Link
            href="https://oursafebase.com/contact"
            target="_blank"
            style={footerLink}
          >
            Contact Support
          </Link>
          {' • '}
          <Link
            href="https://oursafebase.com/privacy-policy"
            target="_blank"
            style={footerLink}
          >
            Privacy Policy
          </Link>
        </Text>
        
        <Text style={footerNote}>
          This is an automated email from OurSafeBase. Please do not reply to this message.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default PasswordResetEmail

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
  borderRadius: '8px',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
}

const logoSection = {
  padding: '32px 0',
  textAlign: 'center' as const,
}

const logo = {
  margin: '0 auto',
}

const h1 = {
  color: '#1a1a1a',
  fontSize: '28px',
  fontWeight: '700',
  margin: '0 0 30px',
  padding: '0 48px',
  lineHeight: '1.3',
  textAlign: 'center' as const,
}

const text = {
  color: '#404040',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '0 0 20px',
  padding: '0 48px',
}

const buttonContainer = {
  padding: '27px 48px',
  textAlign: 'center' as const,
}

const button = {
  backgroundColor: '#0066cc',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 32px',
  lineHeight: '1.5',
}

const linkText = {
  color: '#0066cc',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '0 0 20px',
  padding: '0 48px',
  wordBreak: 'break-all' as const,
}

const noteText = {
  color: '#666666',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0 0 16px',
  padding: '0 48px',
}

const divider = {
  borderTop: '1px solid #e6e6e6',
  margin: '32px 48px',
}

const footer = {
  color: '#666666',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '0',
  padding: '0 48px',
  textAlign: 'center' as const,
}

const footerLink = {
  color: '#0066cc',
  textDecoration: 'none',
}

const footerNote = {
  color: '#999999',
  fontSize: '12px',
  lineHeight: '20px',
  margin: '16px 0 0',
  padding: '0 48px',
  textAlign: 'center' as const,
}
