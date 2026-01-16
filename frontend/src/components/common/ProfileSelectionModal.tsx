import React, { useState } from 'react';
import { Stethoscope, Heart, Activity, Users } from 'lucide-react';
import { ProfileType } from '../../contexts/UserProfileContext';

interface ProfileSelectionModalProps {
  isOpen: boolean;
  onSelect: (profile: ProfileType) => void;
}

const ProfileSelectionModal: React.FC<ProfileSelectionModalProps> = ({ isOpen, onSelect }) => {
  const [isAnimating, setIsAnimating] = useState(true);

  if (!isOpen) return null;

  const handleSelect = (profile: ProfileType) => {
    setIsAnimating(false);
    setTimeout(() => {
      onSelect(profile);
    }, 200);
  };

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-all duration-300 ${
        isAnimating ? 'bg-black/70 backdrop-blur-md' : 'bg-transparent'
      }`}
    >
      <div
        className={`relative max-w-2xl w-full transform transition-all duration-300 ${
          isAnimating ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center gap-2 mb-4">
            <Activity className="w-8 h-8 text-red-400" />
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-white">
              ECO RJ
            </h1>
            <Heart className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl sm:text-2xl text-white/90 font-medium mb-2">
            Como podemos ajudar?
          </h2>
          <p className="text-white/60 text-sm sm:text-base">
            Selecione seu perfil para uma experiencia personalizada
          </p>
        </div>

        {/* Cards */}
        <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
          {/* Medico/Aluno Card */}
          <button
            onClick={() => handleSelect('student')}
            className="group relative bg-white/10 backdrop-blur-lg rounded-2xl p-6 sm:p-8 border border-white/20 hover:border-primary-400/50 hover:bg-white/15 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-primary-500/20 text-left"
          >
            <div className="absolute top-4 right-4 w-12 h-12 rounded-full bg-primary-500/20 flex items-center justify-center group-hover:bg-primary-500/30 transition-colors">
              <Stethoscope className="w-6 h-6 text-primary-300" />
            </div>

            <div className="mb-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center mb-4 shadow-lg shadow-primary-500/30">
                <Users className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
                Sou Medico/Aluno
              </h3>
              <p className="text-white/70 text-sm sm:text-base leading-relaxed">
                Acesse cursos de ecocardiografia, aulas, exercicios e certificados de conclusao.
              </p>
            </div>

            <div className="flex items-center gap-2 text-primary-300 text-sm font-medium group-hover:text-primary-200 transition-colors">
              <span>Acessar plataforma de cursos</span>
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>

          {/* Paciente Card */}
          <button
            onClick={() => handleSelect('patient')}
            className="group relative bg-white/10 backdrop-blur-lg rounded-2xl p-6 sm:p-8 border border-white/20 hover:border-red-400/50 hover:bg-white/15 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-red-500/20 text-left"
          >
            <div className="absolute top-4 right-4 w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center group-hover:bg-red-500/30 transition-colors">
              <Heart className="w-6 h-6 text-red-300" />
            </div>

            <div className="mb-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center mb-4 shadow-lg shadow-red-500/30">
                <Heart className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
                Sou Paciente
              </h3>
              <p className="text-white/70 text-sm sm:text-base leading-relaxed">
                Agende sua consulta ou exame de ecocardiografia e diagnostico vascular.
              </p>
            </div>

            <div className="flex items-center gap-2 text-red-300 text-sm font-medium group-hover:text-red-200 transition-colors">
              <span>Agendar consulta ou exame</span>
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-white/40 text-xs sm:text-sm mt-6">
          Centro de Treinamento em Ecocardiografia
        </p>
      </div>
    </div>
  );
};

export default ProfileSelectionModal;
