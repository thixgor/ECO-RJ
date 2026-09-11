import React, { useState, useEffect } from 'react';
import { Smartphone, Monitor, Apple, ExternalLink, Clock } from 'lucide-react';
import { siteConfigService } from '../services/api';
import { GlassCard } from '../components/ui';
import Loading from '../components/common/Loading';

interface AppDownloadConfig {
  windows: {
    enabled: boolean;
    url?: string;
    comingSoon: boolean;
  };
  ios: {
    enabled: boolean;
    url?: string;
    comingSoon: boolean;
  };
  android: {
    enabled: boolean;
    url?: string;
    comingSoon: boolean;
  };
}

const DEFAULT_APP_CONFIG: AppDownloadConfig = {
  windows: { enabled: false, url: '', comingSoon: true },
  ios: { enabled: false, url: '', comingSoon: true },
  android: { enabled: false, url: '', comingSoon: true }
};

const AppDownload: React.FC = () => {
  const [config, setConfig] = useState<AppDownloadConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [platform, setPlatform] = useState<'windows' | 'mac' | 'ios' | 'android' | 'unknown'>('unknown');

  useEffect(() => {
    detectPlatform();
    loadConfig();
  }, []);

  const detectPlatform = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    const platform = navigator.platform.toLowerCase();

    if (/iphone|ipad|ipod/.test(userAgent)) {
      setPlatform('ios');
    } else if (/android/.test(userAgent)) {
      setPlatform('android');
    } else if (/mac/.test(platform)) {
      setPlatform('mac');
    } else if (/win/.test(platform)) {
      setPlatform('windows');
    } else {
      setPlatform('unknown');
    }
  };

  const loadConfig = async () => {
    try {
      const response = await siteConfigService.get();
      setConfig(response.data?.appDownload || DEFAULT_APP_CONFIG);
    } catch (error) {
      console.error('Erro ao carregar configuracoes:', error);
      setConfig(DEFAULT_APP_CONFIG);
    } finally {
      setIsLoading(false);
    }
  };

  const isDesktop = platform === 'windows' || platform === 'mac';

  if (isLoading) {
    return <Loading size="lg" text="Carregando..." />;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="w-20 h-20 bg-gradient-to-br from-primary-400 to-primary-600 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-lg shadow-primary-500/30">
          <Smartphone className="w-10 h-10 text-white" />
        </div>
        <h1 className="font-heading text-3xl md:text-4xl font-bold text-[var(--color-text-primary)] mb-4">
          Aplicativo ECO RJ
        </h1>
        <p className="text-lg text-[var(--color-text-secondary)] max-w-2xl mx-auto">
          Tenha acesso as suas aulas e conteudos na palma da sua mao. Baixe nosso aplicativo
          e estude onde e quando quiser, com a mesma qualidade do portal web.
        </p>
      </div>

      {/* Features */}
      <GlassCard className="mb-8 p-6">
        <h2 className="font-heading text-xl font-semibold text-[var(--color-text-primary)] mb-4">
          Recursos do Aplicativo
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
              <span className="text-emerald-500 text-lg">1</span>
            </div>
            <div>
              <h3 className="font-medium text-[var(--color-text-primary)]">Acesso Offline</h3>
              <p className="text-sm text-[var(--color-text-muted)]">Baixe aulas e assista sem internet</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
              <span className="text-blue-500 text-lg">2</span>
            </div>
            <div>
              <h3 className="font-medium text-[var(--color-text-primary)]">Notificacoes</h3>
              <p className="text-sm text-[var(--color-text-muted)]">Receba alertas de novas aulas e eventos</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
              <span className="text-purple-500 text-lg">3</span>
            </div>
            <div>
              <h3 className="font-medium text-[var(--color-text-primary)]">Sincronizacao</h3>
              <p className="text-sm text-[var(--color-text-muted)]">Seu progresso sincronizado automaticamente</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
              <span className="text-amber-500 text-lg">4</span>
            </div>
            <div>
              <h3 className="font-medium text-[var(--color-text-primary)]">Interface Otimizada</h3>
              <p className="text-sm text-[var(--color-text-muted)]">Experiencia nativa para cada plataforma</p>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Download Buttons */}
      <div className="space-y-4">
        <h2 className="font-heading text-xl font-semibold text-[var(--color-text-primary)] text-center mb-6">
          Escolha sua plataforma
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Windows */}
          <DownloadButton
            platform="Windows"
            icon={<Monitor className="w-8 h-8" />}
            config={config?.windows}
            highlight={isDesktop && platform === 'windows'}
          />

          {/* iOS / App Store */}
          <DownloadButton
            platform="App Store"
            subtitle="iPhone e iPad"
            icon={<Apple className="w-8 h-8" />}
            config={config?.ios}
            highlight={platform === 'ios'}
            isAppStore
          />

          {/* Android / Play Store */}
          <DownloadButton
            platform="Google Play"
            subtitle="Android"
            icon={<PlayStoreIcon />}
            config={config?.android}
            highlight={platform === 'android'}
            isPlayStore
          />
        </div>
      </div>

      {/* Info */}
      <div className="mt-10 text-center">
        <p className="text-sm text-[var(--color-text-muted)]">
          Ao baixar o aplicativo, voce concorda com nossos{' '}
          <a href="/termos" className="text-primary-500 hover:underline">Termos de Servico</a>
          {' '}e{' '}
          <a href="/privacidade" className="text-primary-500 hover:underline">Politica de Privacidade</a>.
        </p>
      </div>
    </div>
  );
};

// Play Store Icon Component
const PlayStoreIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor">
    <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 0 1 0 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.8 9.99l-2.302 2.302-8.634-8.634z"/>
  </svg>
);

// Download Button Component
interface DownloadButtonProps {
  platform: string;
  subtitle?: string;
  icon: React.ReactNode;
  config?: { enabled: boolean; url?: string; comingSoon: boolean };
  highlight?: boolean;
  isAppStore?: boolean;
  isPlayStore?: boolean;
}

const DownloadButton: React.FC<DownloadButtonProps> = ({
  platform,
  subtitle,
  icon,
  config,
  highlight,
  isAppStore,
  isPlayStore
}) => {
  // Mostrar "Em breve" apenas se comingSoon estiver true ou se não tiver URL quando não for coming soon
  const isComingSoon = config?.comingSoon !== false;
  const url = config?.url;

  if (isComingSoon) {
    return (
      <div
        className={`relative p-6 rounded-2xl border-2 border-dashed transition-all ${
          highlight
            ? 'border-primary-500/50 bg-primary-500/5'
            : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-white/5'
        }`}
      >
        {highlight && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary-500 text-white text-xs font-bold">
            Seu dispositivo
          </div>
        )}
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gray-200 dark:bg-white/10 flex items-center justify-center text-gray-400 dark:text-gray-500">
            {icon}
          </div>
          <h3 className="font-semibold text-[var(--color-text-primary)] mb-1">{platform}</h3>
          {subtitle && <p className="text-xs text-[var(--color-text-muted)] mb-3">{subtitle}</p>}
          <div className="flex items-center justify-center gap-2 text-amber-500">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-medium">Em breve</span>
          </div>
        </div>
      </div>
    );
  }

  // App Store style button
  if (isAppStore && url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`relative block p-6 rounded-2xl border-2 transition-all hover:scale-[1.02] hover:shadow-lg ${
          highlight
            ? 'border-primary-500 bg-primary-500/10 shadow-lg shadow-primary-500/20'
            : 'border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:border-primary-500/50'
        }`}
      >
        {highlight && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary-500 text-white text-xs font-bold">
            Seu dispositivo
          </div>
        )}
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-black flex items-center justify-center text-white">
            {icon}
          </div>
          <p className="text-xs text-[var(--color-text-muted)] mb-1">Disponivel na</p>
          <h3 className="font-semibold text-[var(--color-text-primary)] text-lg">{platform}</h3>
          {subtitle && <p className="text-xs text-[var(--color-text-muted)]">{subtitle}</p>}
          <div className="flex items-center justify-center gap-1 mt-3 text-primary-500">
            <ExternalLink className="w-4 h-4" />
            <span className="text-sm font-medium">Baixar</span>
          </div>
        </div>
      </a>
    );
  }

  // Play Store style button
  if (isPlayStore && url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`relative block p-6 rounded-2xl border-2 transition-all hover:scale-[1.02] hover:shadow-lg ${
          highlight
            ? 'border-primary-500 bg-primary-500/10 shadow-lg shadow-primary-500/20'
            : 'border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:border-primary-500/50'
        }`}
      >
        {highlight && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary-500 text-white text-xs font-bold">
            Seu dispositivo
          </div>
        )}
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br from-green-400 via-blue-500 to-purple-500 flex items-center justify-center text-white">
            {icon}
          </div>
          <p className="text-xs text-[var(--color-text-muted)] mb-1">Disponivel no</p>
          <h3 className="font-semibold text-[var(--color-text-primary)] text-lg">{platform}</h3>
          {subtitle && <p className="text-xs text-[var(--color-text-muted)]">{subtitle}</p>}
          <div className="flex items-center justify-center gap-1 mt-3 text-primary-500">
            <ExternalLink className="w-4 h-4" />
            <span className="text-sm font-medium">Baixar</span>
          </div>
        </div>
      </a>
    );
  }

  // Windows / Generic button
  if (url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`relative block p-6 rounded-2xl border-2 transition-all hover:scale-[1.02] hover:shadow-lg ${
          highlight
            ? 'border-primary-500 bg-primary-500/10 shadow-lg shadow-primary-500/20'
            : 'border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:border-primary-500/50'
        }`}
      >
        {highlight && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary-500 text-white text-xs font-bold">
            Seu dispositivo
          </div>
        )}
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white">
            {icon}
          </div>
          <p className="text-xs text-[var(--color-text-muted)] mb-1">Baixar para</p>
          <h3 className="font-semibold text-[var(--color-text-primary)] text-lg">{platform}</h3>
          {subtitle && <p className="text-xs text-[var(--color-text-muted)]">{subtitle}</p>}
          <div className="flex items-center justify-center gap-1 mt-3 text-primary-500">
            <ExternalLink className="w-4 h-4" />
            <span className="text-sm font-medium">Download</span>
          </div>
        </div>
      </a>
    );
  }

  return null;
};

export default AppDownload;
