import { useState } from 'react';
import StudentIdentityForm from './StudentIdentityForm';
import { studentRequest, useStudentProfile } from '../lib/studentProfile';
import '../styles/student-profile.css';

export default function AccountStudentIdentity() {
  const { profile, loading, error, refresh, setProfile, authFetch } = useStudentProfile();
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState('');
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState('');

  const linkAccount = async () => {
    setLinking(true);
    setLinkError('');
    try {
      const result = await studentRequest<{ profile: NonNullable<typeof profile> }>('/api/student-profile', { action: 'linkAccount' }, authFetch);
      setProfile(result.profile);
      setMessage('Данные связаны с аккаунтом. Ваш вариант сохранён.');
    } catch (reason) { setLinkError(reason instanceof Error ? reason.message : 'Не удалось связать данные с аккаунтом.'); }
    finally { setLinking(false); }
  };

  return <div className="account-lab-identity">
    <div className="account-lab-identity-heading"><h3>Данные для работ</h3>{!loading && !error && !editing && <button type="button" onClick={() => { setEditing(true); setMessage(''); }}>{profile ? 'Изменить' : 'Заполнить'}</button>}</div>
    {loading ? <p role="status">Загружаем ФИО и группу…</p> : error ? <><p role="alert">{error}</p><button type="button" onClick={() => void refresh()}>Повторить</button></> : <>
      {editing ? <>
        <StudentIdentityForm key={profile?.id ?? 'new'} profile={profile} onComplete={saved => { setProfile(saved); setEditing(false); setMessage('ФИО и группа сохранены. Ваш вариант не изменился.'); }} />
        <button type="button" className="account-lab-identity-cancel" onClick={() => setEditing(false)}>Закрыть</button>
      </> : profile ? <dl><div><dt>Фамилия</dt><dd>{profile.lastName}</dd></div><div><dt>Имя</dt><dd>{profile.firstName}</dd></div><div><dt>Группа</dt><dd>{profile.group}</dd></div></dl> : <p>Укажите ФИО и группу один раз — они будут подставляться в лабораторных работах.</p>}
      {profile && !profile.accountLinked && <div className="account-lab-link"><p>Данные пока сохранены на этом устройстве. Привяжите их к аккаунту, чтобы открывать свой вариант на других устройствах.</p><button type="button" disabled={linking} onClick={() => void linkAccount()}>{linking ? 'Связываем…' : 'Связать с аккаунтом'}</button></div>}
      {linkError && <p role="alert">{linkError}</p>}
      {message && <p role="status">{message}</p>}
    </>}
  </div>;
}
