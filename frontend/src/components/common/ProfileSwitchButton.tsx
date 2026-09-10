import React from 'react';
import { useLocation } from 'react-router-dom';
import { useUserProfile } from '../../contexts/UserProfileContext';

/**
 * Troca entre a porta do médico e a porta do paciente, na página inicial.
 *
 * Antes: pílula de vidro flutuante no canto, com quatro ícones e dois textos
 * coloridos. Agora: uma linha tipográfica ancorada na régua inferior — a
 * escolha continua à mão, mas para de competir com o conteúdo.
 */
const ProfileSwitchButton: React.FC = () => {
  const { profileType, setProfileType, hasSelectedProfile } = useUserProfile();
  const location = useLocation();

  if (location.pathname !== '/' || !hasSelectedProfile) return null;

  const isPatient = profileType === 'patient';
  const destino = isPatient ? 'médico ou aluno' : 'paciente';

  return (
    <div className="fixed bottom-0 inset-x-0 z-sticky border-t border-[var(--color-rule)] bg-[var(--color-paper)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-2.5 flex items-center justify-between gap-4">
        <p className="label-caps truncate">
          {isPatient ? 'Você está na área do paciente' : 'Você está na área do aluno'}
        </p>
        <button
          onClick={() => setProfileType(isPatient ? 'student' : 'patient')}
          className="flex-shrink-0 text-xs font-medium text-[var(--color-accent)] underline underline-offset-4 decoration-1 hover:decoration-2 transition-[text-decoration-thickness] duration-micro ease-out whitespace-nowrap"
        >
          Sou {destino}
        </button>
      </div>
    </div>
  );
};

export default ProfileSwitchButton;
