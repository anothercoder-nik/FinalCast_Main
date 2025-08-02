import * as React from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from '@tanstack/react-router';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import CssBaseline from '@mui/material/CssBaseline';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormLabel from '@mui/material/FormLabel';
import FormControl from '@mui/material/FormControl';
import Link from '@mui/material/Link';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import MuiCard from '@mui/material/Card';
import { styled } from '@mui/material/styles';
import AppTheme from '../shared-theme/AppTheme.js';
import ColorModeSelect from '../shared-theme/ColorModeSelect.js';
import { GoogleIcon, FacebookIcon, SitemarkIcon } from './components/CustomIcons.js';
import { getApiUrl } from '../../utils/config.js';
import RegistrationOTPVerification from '../auth/RegistrationOTPVerification.jsx';

import { registerUser } from '../../api/user.api.js';
import { login } from '../../store/slice/authslice.js';

const Card = styled(MuiCard)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignSelf: 'center',
  width: '100%',
  padding: theme.spacing(4),
  gap: theme.spacing(2),
  margin: 'auto',
  boxShadow:
    'hsla(220, 30%, 5%, 0.05) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.05) 0px 15px 35px -5px',
  [theme.breakpoints.up('sm')]: {
    width: '450px',
  },
  ...theme.applyStyles('dark', {
    boxShadow:
      'hsla(220, 30%, 5%, 0.5) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.08) 0px 15px 35px -5px',
  }),
}));

const SignUpContainer = styled(Stack)(({ theme }) => ({
  height: '100vh',
  minHeight: '100vh',
  maxHeight: '100vh',
  overflow: 'hidden',
  padding: theme.spacing(2),
  [theme.breakpoints.up('sm')]: {
    padding: theme.spacing(4),
  },
  '&::before': {
    content: '""',
    display: 'block',
    position: 'absolute',
    zIndex: -1,
    inset: 0,
    backgroundImage:
      'radial-gradient(ellipse at 50% 50%, hsl(210, 100%, 97%), hsl(0, 0%, 100%))',
    backgroundRepeat: 'no-repeat',
    ...theme.applyStyles('dark', {
      backgroundImage:
        'radial-gradient(at 50% 50%, hsla(210, 100%, 16%, 0.5), hsl(220, 30%, 5%))',
    }),
  },
}));

export default function SignUp(props) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  // Get redirect parameter from props (passed from AuthPage)
  const redirectTo = props.redirectTo && props.redirectTo !== 'null' && props.redirectTo !== 'undefined' ? props.redirectTo : null;

  const [emailError, setEmailError] = React.useState(false);
  const [emailErrorMessage, setEmailErrorMessage] = React.useState('');
  const [passwordError, setPasswordError] = React.useState(false);
  const [passwordErrorMessage, setPasswordErrorMessage] = React.useState('');
  const [nameError, setNameError] = React.useState(false);
  const [nameErrorMessage, setNameErrorMessage] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  
  // OTP verification states
  const [showOTPVerification, setShowOTPVerification] = React.useState(false);
  const [registrationData, setRegistrationData] = React.useState(null);
  const [verifiedOtpId, setVerifiedOtpId] = React.useState(null);
  const validateInputs = () => {
    const email = document.getElementById('email');
    const password = document.getElementById('password');
    const name = document.getElementById('name');

    let isValid = true;

    if (!email.value || !/\S+@\S+\.\S+/.test(email.value)) {
      setEmailError(true);
      setEmailErrorMessage('Please enter a valid email address.');
      isValid = false;
    } else {
      setEmailError(false);
      setEmailErrorMessage('');
    }

    if (!password.value || password.value.length < 6) {
      setPasswordError(true);
      setPasswordErrorMessage('Password must be at least 6 characters long.');
      isValid = false;
    } else {
      setPasswordError(false);
      setPasswordErrorMessage('');
    }

    if (!name.value || name.value.length < 1) {
      setNameError(true);
      setNameErrorMessage('Name is required.');
      isValid = false;
    } else {
      setNameError(false);
      setNameErrorMessage('');
    }



    return isValid;
  };

   const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!validateInputs()) {
      return;
    }

    const data = new FormData(event.currentTarget);
    const formData = {
      name: data.get('name'),
      email: data.get('email'),
      password: data.get('password')
    };
    
    // Store registration data and show OTP verification
    setRegistrationData(formData);
    setShowOTPVerification(true);
  };

  const handleOTPVerified = async (otpId) => {
    setLoading(true);
    setVerifiedOtpId(otpId);
    
    try {
      const response = await registerUser(
        registrationData.name,
        registrationData.password,
        registrationData.email,
        otpId
      );
      
      console.log('Registration response:', response);
      
      // Store token in localStorage for persistence
      if (response.token) {
        localStorage.setItem('accessToken', response.token);
      }
      
      dispatch(login({
        user: response.user,
        token: response.token
      }));
      
      // Use redirect parameter if provided, otherwise go to dashboard
      const destination = redirectTo || '/dashboard';
      console.log('🎯 Original redirectTo:', redirectTo);
      console.log('🎯 Final destination:', destination);
      console.log('🎯 Redirecting new user to:', destination);
      navigate({ to: destination });
    } catch (error) {
      console.error('Registration failed:', error);
      setEmailError(true);
      setEmailErrorMessage(error?.message || 'Registration failed');
      setShowOTPVerification(false); // Go back to registration form
    } finally {
      setLoading(false);
    }
  };

  const handleBackToRegistration = () => {
    setShowOTPVerification(false);
    setRegistrationData(null);
    setVerifiedOtpId(null);
  };

  const handleGoogleSignup = () => {
    // Include redirect parameter in Google OAuth flow
    let oauthUrl = `${getApiUrl()}/api/auth/google`;
    if (redirectTo) {
      oauthUrl += `?redirect=${encodeURIComponent(redirectTo)}`;
    }
    
    window.location.href = oauthUrl;
  };

  return (
    <AppTheme {...props}>
      <CssBaseline enableColorScheme />
      <ColorModeSelect sx={{ position: 'fixed', top: '1rem', right: '1rem' }} />
      <SignUpContainer direction="column" justifyContent="space-between">
        {showOTPVerification ? (
          <RegistrationOTPVerification
            email={registrationData?.email}
            name={registrationData?.name}
            onVerified={handleOTPVerified}
            onBack={handleBackToRegistration}
            redirectTo={redirectTo}
          />
        ) : (
          <Card variant="outlined">
            <SitemarkIcon />
            <Typography
              component="h1"
              variant="h4"
              sx={{ width: '100%', fontSize: 'clamp(2rem, 10vw, 2.15rem)' }}
            >
              {redirectTo ? 'Join Studio Session' : 'Sign up'}
            </Typography>
            {redirectTo && (
              <Typography variant="body2" color="primary" sx={{ mb: 2, textAlign: 'center' }}>
                🎥 You've been invited to join a FinalCast studio session. Create your account to continue.
              </Typography>
            )}
            <Box
              component="form"
              onSubmit={handleSubmit}
              sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
            >
              <FormControl>
                <FormLabel htmlFor="name">Full name</FormLabel>
                <TextField
                  autoComplete="name"
                  name="name"
                  required
                  fullWidth
                  id="name"
                  placeholder="Jon Snow"
                  error={nameError}
                  helperText={nameErrorMessage}
                  color={nameError ? 'error' : 'primary'}
                />
              </FormControl>
              <FormControl>
                <FormLabel htmlFor="email">Email</FormLabel>
                <TextField
                  required
                  fullWidth
                  id="email"
                  placeholder="your@email.com"
                  name="email"
                  autoComplete="email"
                  variant="outlined"
                  error={emailError}
                  helperText={emailErrorMessage}
                  color={passwordError ? 'error' : 'primary'}
                />
              </FormControl>
              <FormControl>
                <FormLabel htmlFor="password">Password</FormLabel>
                <TextField
                  required
                  fullWidth
                  name="password"
                  placeholder="••••••"
                  type="password"
                  id="password"
                  autoComplete="new-password"
                  variant="outlined"
                  error={passwordError}
                  helperText={passwordErrorMessage}
                  color={passwordError ? 'error' : 'primary'}
                />
              </FormControl>
              <FormControlLabel
                control={<Checkbox value="allowExtraEmails" color="primary" />}
                label="I want to receive updates via email."
              />
               <Button
                type="submit"
                fullWidth
                variant="contained"
                onClick={validateInputs}
                disabled={loading}
              >
                {loading ? 'Sending Verification...' : 'Continue to Email Verification'}
              </Button>
            </Box>
            <Divider>
              <Typography sx={{ color: 'text.secondary' }}>or</Typography>
            </Divider>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Button
                fullWidth
                
                variant="outlined"
                onClick={handleGoogleSignup}
                startIcon={<GoogleIcon />}
              >
                Sign up with Google
              </Button>
            
              <Typography sx={{ textAlign: 'center' }}>
                Already have an account?{' '}
                <Link
                  href="/material-ui/getting-started/templates/sign-in/"
                  variant="body2"
                  onClick={() => navigate({ 
                    to: '/auth', 
                    search: { 
                      mode: 'signin', 
                      redirect: redirectTo 
                    } 
                  })}
                  sx={{ alignSelf: 'center' }}
                >
                  Sign in
                </Link>
              </Typography>
            </Box>
          </Card>
        )}
      </SignUpContainer>
    </AppTheme>
  );
}
