import { useState } from 'react';
import { RegisterPage } from './components/RegisterPage';
import { PrivacyConsent } from './components/PrivacyConsent';
import './App.css';

function App() {
  const [hasAcceptedPrivacy, setHasAcceptedPrivacy] = useState(false);

  return (
    <>
      {!hasAcceptedPrivacy ? (
        <PrivacyConsent onAccept={() => setHasAcceptedPrivacy(true)} />
      ) : (
        <RegisterPage />
      )}
    </>
  );
}

export default App;
