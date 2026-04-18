import { useState } from 'react';
import type { UserRole, RegistrationData } from '../../types/auth';

interface EmailAuthFormProps {
  mode: 'login' | 'register' | 'reset';
  onSubmit: (email: string, password: string) => Promise<void>;
  onRegister: (data: RegistrationData) => Promise<void>;
  onResetPassword?: (email: string) => Promise<void>;
}

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'pupil', label: 'Школьник' },
  { value: 'student', label: 'Студент' },
  { value: 'teacher', label: 'Учитель' },
  { value: 'tutor', label: 'Репетитор' },
];

export default function EmailAuthForm({ mode, onSubmit, onRegister, onResetPassword }: EmailAuthFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('pupil');
  const [grade, setGrade] = useState('');
  const [course, setCourse] = useState('');
  const [institution, setInstitution] = useState('');
  const [city, setCity] = useState('');
  const [subject, setSubject] = useState('');
  const [experience, setExperience] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (mode === 'register') {
      if (password !== confirmPassword) {
        setValidationError('Пароли не совпадают');
        return;
      }
      if (password.length < 6) {
        setValidationError('Пароль должен быть не менее 6 символов');
        return;
      }
      if (!fullName.trim()) {
        setValidationError('Введите имя');
        return;
      }
      // Validate role-specific required fields
      if (role === 'pupil') {
        if (!grade) {
          setValidationError('Выберите класс');
          return;
        }
        if (!institution.trim()) {
          setValidationError('Введите название школы');
          return;
        }
      }
      if (role === 'student') {
        if (!course) {
          setValidationError('Выберите курс');
          return;
        }
        if (!institution.trim()) {
          setValidationError('Введите учебное заведение');
          return;
        }
      }
    }

    setIsLoading(true);
    try {
      if (mode === 'reset' && onResetPassword) {
        await onResetPassword(email);
      } else if (mode === 'register') {
        const data: RegistrationData = {
          email,
          password,
          fullName,
          role,
        };

        if (role === 'pupil') {
          if (grade) data.grade = parseInt(grade, 10);
          if (institution) data.institution = institution;
        }
        if (role === 'student') {
          if (course) data.course = parseInt(course, 10);
          if (institution) data.institution = institution;
        }
        if (role === 'teacher') {
          if (experience) data.experience = parseInt(experience, 10);
          if (subject) data.subject = subject;
          if (institution) data.institution = institution;
          if (city) data.city = city;
        }
        if (role === 'tutor') {
          if (experience) data.experience = parseInt(experience, 10);
          if (subject) data.subject = subject;
          if (city) data.city = city;
        }

        await onRegister(data);
      } else {
        await onSubmit(email, password);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const renderRoleFields = () => {
    switch (role) {
      case 'pupil':
        return (
          <>
            <select
              value={grade}
              onChange={e => setGrade(e.target.value)}
              className="auth-input auth-select"
              required
            >
              <option value="">Класс *</option>
              {Array.from({ length: 6 }, (_, i) => i + 7).map(g => (
                <option key={g} value={g}>{g} класс</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Школа *"
              value={institution}
              onChange={e => setInstitution(e.target.value)}
              className="auth-input"
              required
            />
          </>
        );

      case 'student':
        return (
          <>
            <select
              value={course}
              onChange={e => setCourse(e.target.value)}
              className="auth-input auth-select"
              required
            >
              <option value="">Курс *</option>
              {Array.from({ length: 6 }, (_, i) => i + 1).map(c => (
                <option key={c} value={c}>{c} курс</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Учебное заведение *"
              value={institution}
              onChange={e => setInstitution(e.target.value)}
              className="auth-input"
              required
            />
          </>
        );

      case 'teacher':
        return (
          <>
            <input
              type="number"
              min="0"
              max="50"
              placeholder="Стаж (лет)"
              value={experience}
              onChange={e => setExperience(e.target.value)}
              className="auth-input"
            />
            <input
              type="text"
              placeholder="Предмет"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="auth-input"
            />
            <input
              type="text"
              placeholder="Школа"
              value={institution}
              onChange={e => setInstitution(e.target.value)}
              className="auth-input"
            />
            <input
              type="text"
              placeholder="Город"
              value={city}
              onChange={e => setCity(e.target.value)}
              className="auth-input"
            />
          </>
        );

      case 'tutor':
        return (
          <>
            <input
              type="number"
              min="0"
              max="50"
              placeholder="Стаж (лет)"
              value={experience}
              onChange={e => setExperience(e.target.value)}
              className="auth-input"
            />
            <input
              type="text"
              placeholder="Предмет"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="auth-input"
            />
            <input
              type="text"
              placeholder="Город"
              value={city}
              onChange={e => setCity(e.target.value)}
              className="auth-input"
            />
          </>
        );

      default:
        return null;
    }
  };

  if (mode === 'reset') {
    return (
      <form className="email-auth-form" onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          className="auth-input"
        />
        <button
          type="submit"
          className="auth-submit-btn"
          disabled={isLoading}
        >
          {isLoading ? 'Отправка...' : 'Восстановить пароль'}
        </button>
      </form>
    );
  }

  if (mode === 'register') {
    return (
      <form className="email-auth-form" onSubmit={handleSubmit}>
        {validationError && (
          <div className="auth-validation-error">{validationError}</div>
        )}

        <input
          type="text"
          placeholder="Имя *"
          value={fullName}
          onChange={e => setFullName(e.target.value)}
          required
          className="auth-input"
        />

        <input
          type="email"
          placeholder="Email *"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          className="auth-input"
        />

        <input
          type="password"
          placeholder="Пароль *"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          minLength={6}
          className="auth-input"
        />

        <input
          type="password"
          placeholder="Подтвердите пароль *"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          required
          minLength={6}
          className="auth-input"
        />

        <div className="auth-section-label">Кто вы?</div>

        <div className="auth-role-selector">
          {ROLES.map(r => (
            <button
              key={r.value}
              type="button"
              className={`auth-role-btn ${role === r.value ? 'active' : ''}`}
              onClick={() => setRole(r.value)}
            >
              {r.label}
            </button>
          ))}
        </div>

        {renderRoleFields()}

        <button
          type="submit"
          className="auth-submit-btn"
          disabled={isLoading}
        >
          {isLoading ? 'Регистрация...' : 'Создать аккаунт'}
        </button>
      </form>
    );
  }

  // Login mode
  return (
    <form className="email-auth-form" onSubmit={handleSubmit}>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
        className="auth-input"
      />
      <input
        type="password"
        placeholder="Пароль"
        value={password}
        onChange={e => setPassword(e.target.value)}
        required
        minLength={6}
        className="auth-input"
      />
      <button
        type="submit"
        className="auth-submit-btn"
        disabled={isLoading}
      >
        {isLoading ? 'Загрузка...' : 'Войти'}
      </button>
    </form>
  );
}
