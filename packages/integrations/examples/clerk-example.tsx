import React from 'react';
import { 
  ClerkProvider, 
  SignedIn, 
  SignedOut, 
  UserButton, 
  SignInButton,
  useUser,
  useAuth
} from '@clerk/nextjs';

/**
 * Clerk Authentication Integration Example
 * Demonstrates authentication flow with Clerk in Katalyst
 */
export const ClerkExample: React.FC = () => {
  return (
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}>
      <div style={{ padding: '20px' }}>
        <h2>Clerk Authentication</h2>
        
        <SignedOut>
          <div>
            <p>You are not signed in</p>
            <SignInButton mode="modal">
              <button>Sign In</button>
            </SignInButton>
          </div>
        </SignedOut>
        
        <SignedIn>
          <div>
            <p>Welcome! You are signed in.</p>
            <UserProfile />
            <UserButton afterSignOutUrl="/" />
          </div>
        </SignedIn>
      </div>
    </ClerkProvider>
  );
};

const UserProfile: React.FC = () => {
  const { user } = useUser();
  const { getToken } = useAuth();
  
  React.useEffect(() => {
    const fetchToken = async () => {
      const token = await getToken();
      console.log('Auth token:', token);
    };
    fetchToken();
  }, [getToken]);
  
  if (!user) return null;
  
  return (
    <div>
      <h3>User Profile</h3>
      <p>Name: {user.fullName}</p>
      <p>Email: {user.primaryEmailAddress?.emailAddress}</p>
      <p>User ID: {user.id}</p>
    </div>
  );
};

export default ClerkExample;