import { useState } from "react";

interface Props {
  showName: string;
  versionNote: string;
  onSave: (showName: string, versionNote: string) => void;
}

/** 演出名称与演出版本备注 */
export default function ShowInfo({ showName, versionNote, onSave }: Props) {
  const [name, setName] = useState(showName);
  const [note, setNote] = useState(versionNote);
  const dirty = name !== showName || note !== versionNote;

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>演出信息</p>
          <h2>版本备注</h2>
        </div>
        <button className="mini" disabled={!dirty} onClick={() => onSave(name, note)}>
          保存
        </button>
      </div>
      <label>
        <span>演出名称</span>
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label>
        <span>演出版本备注</span>
        <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
    </section>
  );
}
