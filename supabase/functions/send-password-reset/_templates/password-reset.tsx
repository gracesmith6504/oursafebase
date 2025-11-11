import {
  Body,
  Button,
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
  supabase_url: string
  email_action_type: string
  redirect_to: string
  token_hash: string
  token: string
}

export const PasswordResetEmail = ({
  token_hash,
  supabase_url,
  email_action_type,
  redirect_to,
}: PasswordResetEmailProps) => {
  const resetUrl = `${supabase_url}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`;
  
  return (
    <Html>
      <Head />
      <Preview>Reset your OurSafeBase password</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoSection}>
            <Img
              src="https://oursafebase.com/logo.png"
              width="120"
              height="120"
              alt="OurSafeBase"
              style={logo}
            />
          </Section>
          
          <Heading style={h1}>Reset Your Password</Heading>
          
          <Text style={text}>
            We received a request to reset your password for your OurSafeBase account.
          </Text>
          
          <Text style={text}>
            Click the button below to create a new password:
          </Text>
          
          <Section style={buttonContainer}>
            <Button style={button} href={resetUrl}>
              Reset Password
            </Button>
          </Section>
          
          <Text style={text}>
            This link will expire in 1 hour for security reasons.
          </Text>
          
          <Text style={textMuted}>
            If you didn't request a password reset, you can safely ignore this email. 
            Your password will remain unchanged.
          </Text>
          
          <Section style={hr} />
          
          <Text style={footer}>
            <strong>OurSafeBase</strong> - Supporting safer student events
            <br />
            <Link href="https://oursafebase.com" target="_blank" style={link}>
              Visit our website
            </Link>
            {' · '}
            <Link href="https://oursafebase.com/contact" target="_blank" style={link}>
              Contact support
            </Link>
            {' · '}
            <Link href="https://oursafebase.com/privacy-policy" target="_blank" style={link}>
              Privacy Policy
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default PasswordResetEmail

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
}

const logoSection = {
  padding: '32px 20px',
  textAlign: 'center' as const,
}

const logo = {
  margin: '0 auto',
}

const h1 = {
  color: '#1a1a1a',
  fontSize: '28px',
  fontWeight: '700',
  margin: '30px 0',
  padding: '0 20px',
  lineHeight: '1.3',
  textAlign: 'center' as const,
}

const text = {
  color: '#4a5568',
  fontSize: '16px',
  lineHeight: '26px',
  padding: '0 20px',
  margin: '16px 0',
}

const textMuted = {
  color: '#718096',
  fontSize: '14px',
  lineHeight: '24px',
  padding: '0 20px',
  margin: '16px 0',
}

const buttonContainer = {
  padding: '27px 20px',
  textAlign: 'center' as const,
}

const button = {
  backgroundColor: '#6366f1',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 40px',
}

const link = {
  color: '#6366f1',
  textDecoration: 'underline',
  fontSize: '14px',
}

const hr = {
  borderColor: '#e2e8f0',
  borderTop: '1px solid',
  margin: '32px 20px',
}

const footer = {
  color: '#718096',
  fontSize: '12px',
  lineHeight: '20px',
  padding: '0 20px',
  textAlign: 'center' as const,
}
