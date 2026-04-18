import { useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../types/auth';

const ROLE_ICONS: Record<UserRole, ReactNode> = {
  pupil: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
      <path d="M8 7h6" />
      <path d="M8 11h8" />
    </svg>
  ),
  student: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
    </svg>
  ),
  teacher: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <path d="M15 3l2 2-2 2" />
    </svg>
  ),
  tutor: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
      <path d="m15 5 3 3" />
    </svg>
  ),
};

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'pupil', label: 'Школьник' },
  { value: 'student', label: 'Студент' },
  { value: 'teacher', label: 'Учитель' },
  { value: 'tutor', label: 'Репетитор' },
];

export default function ProfileCompletionModal() {
  const { updateProfile, closeProfileCompletion, showProfileCompletion } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [formData, setFormData] = useState({
    grade: '',
    course: '',
    institution: '',
    city: '',
    subject: '',
    experience: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!showProfileCompletion) return null;

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setStep(2);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!selectedRole) return;

    setError('');

    // Validation
    if (selectedRole === 'pupil') {
      if (!formData.grade) {
        setError('Выберите класс');
        return;
      }
      if (!formData.institution.trim()) {
        setError('Введите название школы');
        return;
      }
    }
    if (selectedRole === 'student') {
      if (!formData.course) {
        setError('Выберите курс');
        return;
      }
      if (!formData.institution.trim()) {
        setError('Введите учебное заведение');
        return;
      }
    }

    setIsLoading(true);

    try {
      const updateData: Record<string, unknown> = {
        role: selectedRole,
        profile_completed: true,
      };

      if (selectedRole === 'pupil') {
        updateData.grade = parseInt(formData.grade, 10);
        updateData.institution = formData.institution;
      }

      if (selectedRole === 'student') {
        updateData.course = parseInt(formData.course, 10);
        updateData.institution = formData.institution;
      }

      if (selectedRole === 'teacher') {
        if (formData.experience) updateData.experience = parseInt(formData.experience, 10);
        if (formData.subject) updateData.subject = formData.subject;
        if (formData.institution) updateData.institution = formData.institution;
        if (formData.city) updateData.city = formData.city;
      }

      if (selectedRole === 'tutor') {
        if (formData.experience) updateData.experience = parseInt(formData.experience, 10);
        if (formData.subject) updateData.subject = formData.subject;
        if (formData.city) updateData.city = formData.city;
      }

      await updateProfile(updateData);
      closeProfileCompletion();
    } catch (err) {
      setError('Ошибка сохранения. Попробуйте ещё раз.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const renderRoleFields = () => {
    if (!selectedRole) return null;

    switch (selectedRole) {
      case 'pupil':
        return (
          <>
            <div className="profile-completion-field">
              <label>Класс *</label>
              <select
                value={formData.grade}
                onChange={(e) => handleInputChange('grade', e.target.value)}
                className="profile-completion-select"
                required
              >
                <option value="">Выберите класс</option>
                {Array.from({ length: 6 }, (_, i) => i + 7).map(grade => (
                  <option key={grade} value={grade}>{grade} класс</option>
                ))}
              </select>
            </div>
            <div className="profile-completion-field">
              <label>Школа *</label>
              <input
                type="text"
                value={formData.institution}
                onChange={(e) => handleInputChange('institution', e.target.value)}
                placeholder="Название школы"
                className="profile-completion-input"
                required
              />
            </div>
          </>
        );

      case 'student':
        return (
          <>
            <div className="profile-completion-field">
              <label>Курс *</label>
              <select
                value={formData.course}
                onChange={(e) => handleInputChange('course', e.target.value)}
                className="profile-completion-select"
                required
              >
                <option value="">Выберите курс</option>
                {Array.from({ length: 6 }, (_, i) => i + 1).map(course => (
                  <option key={course} value={course}>{course} курс</option>
                ))}
              </select>
            </div>
            <div className="profile-completion-field">
              <label>Учебное заведение *</label>
              <input
                type="text"
                value={formData.institution}
                onChange={(e) => handleInputChange('institution', e.target.value)}
                placeholder="Название университета/колледжа"
                className="profile-completion-input"
                required
              />
            </div>
          </>
        );

      case 'teacher':
        return (
          <>
            <div className="profile-completion-field">
              <label>Стаж (лет)</label>
              <input
                type="number"
                min="0"
                max="50"
                value={formData.experience}
                onChange={(e) => handleInputChange('experience', e.target.value)}
                placeholder="Опыт работы"
                className="profile-completion-input"
              />
            </div>
            <div className="profile-completion-field">
              <label>Предмет</label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => handleInputChange('subject', e.target.value)}
                placeholder="Например: Физика"
                className="profile-completion-input"
              />
            </div>
            <div className="profile-completion-field">
              <label>Школа</label>
              <input
                type="text"
                value={formData.institution}
                onChange={(e) => handleInputChange('institution', e.target.value)}
                placeholder="Название школы"
                className="profile-completion-input"
              />
            </div>
            <div className="profile-completion-field">
              <label>Город</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                placeholder="Ваш город"
                className="profile-completion-input"
              />
            </div>
          </>
        );

      case 'tutor':
        return (
          <>
            <div className="profile-completion-field">
              <label>Стаж (лет)</label>
              <input
                type="number"
                min="0"
                max="50"
                value={formData.experience}
                onChange={(e) => handleInputChange('experience', e.target.value)}
                placeholder="Опыт работы"
                className="profile-completion-input"
              />
            </div>
            <div className="profile-completion-field">
              <label>Предмет</label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => handleInputChange('subject', e.target.value)}
                placeholder="Например: Физика"
                className="profile-completion-input"
              />
            </div>
            <div className="profile-completion-field">
              <label>Город</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                placeholder="Ваш город"
                className="profile-completion-input"
              />
            </div>
          </>
        );

      default:
        return null;
    }
  };

  const content = (
    <div className="profile-completion-overlay">
      <div className="profile-completion-modal">
        <div className="profile-completion-header">
          <h2>Расскажите о себе</h2>
          <p>Это поможет нам персонализировать ваш опыт</p>
        </div>

        {error && <div className="profile-completion-error">{error}</div>}

        {step === 1 ? (
          <div className="profile-completion-roles">
            {ROLES.map(role => (
              <button
                key={role.value}
                className="profile-completion-role-card"
                onClick={() => handleRoleSelect(role.value)}
              >
                <span className="role-icon">{ROLE_ICONS[role.value]}</span>
                <span className="role-label">{role.label}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="profile-completion-form">
            <div className="profile-completion-selected-role">
              <button className="back-btn" onClick={() => setStep(1)}>
                ← Назад
              </button>
              <span className="selected-role-info">
                <span className="role-icon-small">{selectedRole && ROLE_ICONS[selectedRole]}</span>
                {ROLES.find(r => r.value === selectedRole)?.label}
              </span>
            </div>

            {renderRoleFields()}

            <button
              className="profile-completion-submit"
              onClick={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
