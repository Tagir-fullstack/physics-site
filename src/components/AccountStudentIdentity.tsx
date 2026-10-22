import { ASSESSMENT_GROUPS } from '../lib/monitorGrading';

export type ProfileIdentity = { lastName: string; firstName: string; group: string };
type Props = {
  editing: boolean;
  value: ProfileIdentity;
  onChange: (value: ProfileIdentity) => void;
  variantNumber?: number;
  loading: boolean;
  error: string;
  onRetry: () => void;
};

export default function AccountStudentIdentity({ editing, value, onChange, variantNumber, loading, error, onRetry }: Props) {
  const groups = [...ASSESSMENT_GROUPS] as string[];
  if (value.group && !groups.includes(value.group)) groups.push(value.group);
  return <>
    {(['lastName', 'firstName', 'group'] as const).map(key => <div className="account-field" key={key}>
      <label className="account-label" htmlFor={editing ? `account-${key}` : undefined}>{key === 'lastName' ? 'Фамилия' : key === 'firstName' ? 'Имя' : 'ОП / группа'}</label>
      {editing ? key === 'group' ? <select id="account-group" className="account-select" value={value.group} onChange={event => onChange({ ...value, group: event.target.value })}><option value="">Не указана</option>{groups.map(group => <option key={group}>{group}</option>)}</select> : <input id={`account-${key}`} className="account-input" autoComplete={key === 'lastName' ? 'family-name' : 'given-name'} maxLength={60} value={value[key]} onChange={event => onChange({ ...value, [key]: event.target.value })} /> : <div className="account-value">{value[key] || 'Не указано'}</div>}
    </div>)}
    {variantNumber && <div className="account-field account-student-variant"><span className="account-label">Вариант</span><strong className="account-value">№ {variantNumber}</strong></div>}
    {loading && <p className="account-identity-status" role="status">Загружаем данные профиля…</p>}
    {error && <div className="account-identity-status" role="alert">{error} <button type="button" onClick={onRetry}>Повторить</button></div>}
  </>;
}
