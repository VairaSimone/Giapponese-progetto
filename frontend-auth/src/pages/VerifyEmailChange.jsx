import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from '../api/axiosSetup';

const VerifyEmailChange = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('Verifica in corso...');
  const navigate = useNavigate();
  const token = searchParams.get('token');
  
  // useRef ci permette di capire se abbiamo già inviato la richiesta
  const initialized = useRef(false);

  useEffect(() => {
    // Se la richiesta è già partita in questo ciclo di vita, interrompiamo la seconda
    if (initialized.current) return;
    initialized.current = true;

    const verifyToken = async () => {
      try {
        await axios.get(`/auth/confirm-email-change?token=${token}`);
        setStatus('Email aggiornata con successo! Verrai reindirizzato alla dashboard...');
        
        localStorage.removeItem('accessToken'); 
        localStorage.removeItem('refreshToken');
        
        setTimeout(() => navigate('/login'), 3000);
      } catch (error) {
        setStatus(error.response?.data?.message || 'Errore durante la verifica del token.');
      }
    };

    if (token) verifyToken();
  }, [token, navigate]);

  return (
    <div className="verify-container">
      <h2>Cambio Email</h2>
      <p>{status}</p>
    </div>
  );
};

export default VerifyEmailChange;