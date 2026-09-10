import React, { Suspense, lazy } from 'react';
import { useUserProfile, ProfileType } from '../../contexts/UserProfileContext';
import ProfileSelectionModal from './ProfileSelectionModal';
import ProfileSwitchButton from './ProfileSwitchButton';
import Loading from './Loading';

// Lazy load das paginas
const Home = lazy(() => import('../../pages/Home'));
const PatientHome = lazy(() => import('../../pages/PatientHome'));

const LandingPageWrapper: React.FC = () => {
  const { profileType, setProfileType, hasSelectedProfile } = useUserProfile();

  const handleProfileSelect = (profile: ProfileType) => {
    setProfileType(profile);
  };

  return (
    <>
      {/* Modal de selecao de perfil */}
      <ProfileSelectionModal
        isOpen={!hasSelectedProfile}
        onSelect={handleProfileSelect}
      />

      {/* Conteudo baseado no perfil selecionado.
          O `pb-12` reserva a altura da barra de troca de perfil, que é fixa no
          rodapé — sem isso ela cobriria a última linha do colofão. */}
      {hasSelectedProfile && (
        <div className="pb-12">
          <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loading /></div>}>
            {profileType === 'patient' ? <PatientHome /> : <Home />}
          </Suspense>
        </div>
      )}

      {/* Barra de troca de perfil, ancorada na régua inferior */}
      <ProfileSwitchButton />
    </>
  );
};

export default LandingPageWrapper;
