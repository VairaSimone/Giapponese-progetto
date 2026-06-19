import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from '../api/axiosSetup';

const VerifyEmailChange = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('Verifica in corso...');
  const navigate = useNavigate();
  const token = searchParams.get('token');

  useEffect(() => {
    const verifyToken = async () => {
      try {
        await axios.get(`/auth/confirm-email-change?token=${token}`);
        setStatus('Email aggiornata con successo! Verrai reindirizzato alla dashboard...');
        setTimeout(() => navigate('/'), 3000);
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