import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import useAuthStore from '../../store/useAuthStore';
import { useState } from 'react';

const ProfilePage = () => {
  const myInfo = useAuthStore((state) => state.myInfo);
  const [updateInfo, setUpdateInfo] = useState({
    id: myInfo.id,
    name: myInfo.name,
    email: myInfo.email,
    phone: myInfo.phone,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUpdateInfo({
      ...updateInfo,
      [name]: value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault;
    console.log('제출 데이터: ', updateInfo);
  };
  return (
    <>
      <div>
        <label>
          ID:
          <input
            type="text"
            name="id"
            value={updateInfo.id ? updateInfo.id : ''}
            disabled={true}
            onChange={handleChange}
          />
        </label>

        <label>
          Name:
          <input
            type="text"
            name="name"
            value={updateInfo.name ? updateInfo.name : ''}
            disabled={true}
            onChange={handleChange}
          />
        </label>

        <label>
          Email:
          <input
            type="email"
            name="email"
            value={updateInfo.email ? updateInfo.email : ''}
            onChange={handleChange}
          />
        </label>

        <label>
          Phone:
          <input
            type="tel"
            name="phone"
            value={updateInfo.phone ? updateInfo.email : ''}
            onChange={handleChange}
          />
        </label>
        <button onClick={handleSubmit}>수정</button>
      </div>
    </>
  );
};

export default ProfilePage;
