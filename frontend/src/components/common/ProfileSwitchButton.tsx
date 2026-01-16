import React from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowLeftRight, Stethoscope, Heart } from 'lucide-react';
import { useUserProfile } from '../../contexts/UserProfileContext';

const ProfileSwitchButton: React.FC = () => {
  const { profileType, setProfileType, hasSelectedProfile } = useUserProfile();
  const location = useLocation();

  // Apenas mostrar na landing page (/)
  if (location.pathname !== '/' || !hasSelectedProfile) {
    return null;
  }

  const handleSwitch = () => {
    setProfileType(profileType === 'patient' ? 'student' : 'patient');
  };

  const isPatient = profileType === 'patient';

  return (
    <button
      onClick={handleSwitch}
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3
                 bg-white/90 dark:bg-dark-card/90 backdrop-blur-sm
                 border border-[var(--glass-border)] rounded-full
                 shadow-lg hover:shadow-xl transition-all duration-300
                 text-sm font-medium text-[var(--color-text-secondary)]
                 hover:text-primary-500 hover:border-primary-500/30
                 group"
      title={`Trocar para ${isPatient ? 'Medico/Aluno' : 'Paciente'}`}
    >
      <ArrowLeftRight className="w-4 h-4 group-hover:rotate-180 transition-transform duration-300" />
      <span className="hidden sm:inline">Trocar:</span>
      <span className="flex items-center gap-1">
        {isPatient ? (
          <>
            <Heart className="w-3.5 h-3.5 text-red-500" />
            <span className="text-red-600 dark:text-red-400">Paciente</span>
          </>
        ) : (
          <>
            <Stethoscope className="w-3.5 h-3.5 text-primary-500" />
            <span className="text-primary-600 dark:text-primary-400">Aluno</span>
          </>
        )}
      </span>
      <span className="text-[var(--color-text-muted)]">→</span>
      <span className="flex items-center gap-1">
        {isPatient ? (
          <>
            <Stethoscope className="w-3.5 h-3.5 text-primary-500" />
            <span className="text-primary-600 dark:text-primary-400">Aluno</span>
          </>
        ) : (
          <>
            <Heart className="w-3.5 h-3.5 text-red-500" />
            <span className="text-red-600 dark:text-red-400">Paciente</span>
          </>
        )}
      </span>
    </button>
  );
};

export default ProfileSwitchButton;
