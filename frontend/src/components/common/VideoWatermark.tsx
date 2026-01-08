import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { siteConfigService } from '../../services/api';

// Cache de configurações para evitar múltiplas requisições
let configCache: { enabled: boolean; opacity: number; showForAdmins: boolean } | null = null;
let cacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

const VideoWatermark: React.FC = React.memo(() => {
  const { user } = useAuth();
  const [config, setConfig] = useState<{ enabled: boolean; opacity: number; showForAdmins: boolean } | null>(configCache);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      // Usar cache se ainda estiver válido
      const now = Date.now();
      if (configCache && (now - cacheTime) < CACHE_DURATION) {
        setConfig(configCache);
        return;
      }

      const response = await siteConfigService.get();
      configCache = response.data.watermark;
      cacheTime = now;
      setConfig(configCache);
    } catch (error) {
      console.error('Erro ao carregar configurações de marca d\'água:', error);
    }
  };

  // Não mostrar se não estiver configurado
  if (!config || !config.enabled) return null;

  // Não mostrar para admins se configurado
  if (!config.showForAdmins && user?.cargo === 'Administrador') return null;

  // Não mostrar se não houver usuário ou dados necessários
  if (!user || !user.nomeCompleto || !user.cpf) return null;

  return (
    <div
      className="watermark-overlay"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: config.opacity / 100,
      }}
    >
      <div
        style={{
          transform: 'rotate(-30deg)',
          textAlign: 'center',
          color: 'white',
          textShadow: '2px 2px 4px rgba(0,0,0,0.8), -2px -2px 4px rgba(0,0,0,0.8)',
          fontSize: '24px',
          fontWeight: 'bold',
          lineHeight: '1.5',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
      >
        <div>{user.nomeCompleto}</div>
        <div style={{ fontSize: '20px' }}>{user.cpf}</div>
      </div>
    </div>
  );
});

VideoWatermark.displayName = 'VideoWatermark';

export default VideoWatermark;
