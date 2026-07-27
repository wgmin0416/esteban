import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import useAuthStore from '../../store/useAuthStore';
import useLanguageStore from '../../store/useLanguageStore';
import apiRequest from '../../lib/apiRequest';
import { toastError, toastSuccess, toastWarning } from '../../utils/alert';
import './CourtBoardForm.scss';

const CourtBoardForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isLogin = useAuthStore((state) => state.isLogin);
  const language = useLanguageStore((state) => state.language);

  // 지역 옵션
  const regions = [
    '서울',
    '경기',
    '부산',
    '인천',
    '대구',
    '대전',
    '광주',
    '울산',
    '세종',
    '경남',
    '경북',
    '충남',
    '전남',
    '강원',
    '충북',
    '전북',
    '제주',
  ];

  const [formData, setFormData] = useState({
    type: '대관',
    court_date: '',
    location: '',
    region: '서울',
    cost: '',
    costInquiry: false, // 문의 체크박스
    contact: '',
    court_size: '',
    court_image: '', // URL 입력용
    court_image_files: [], // 파일 객체 배열
    has_parking: false,
    has_shower: false,
    description: '',
  });

  const [loading, setLoading] = useState(false);
  const [imagePreviews, setImagePreviews] = useState([]); // 미리보기 배열
  const [draggedIndex, setDraggedIndex] = useState(null); // 드래그 중인 이미지 인덱스

  useEffect(() => {
    if (!isLogin) {
      toastWarning(language === 'KR' ? '로그인이 필요합니다.' : 'Please login');
      navigate('/login');
      return;
    }

    if (id) {
      loadBoard();
    }
  }, [id, isLogin]);

  const loadBoard = async () => {
    try {
      const response = await apiRequest('get', `/court-boards/${id}`);
      if (response?.data?.board) {
        const board = response.data.board;
        const costValue = board.cost === -1 ? '' : board.cost?.toString() || '';
        const costInquiry = board.cost === -1;

        // 이미지 배열 처리 (기존 단일 URL 호환성 유지)
        const images = Array.isArray(board.court_image)
          ? board.court_image
          : board.court_image
            ? [board.court_image]
            : [];

        setFormData({
          type: board.type,
          court_date: board.court_date ? new Date(board.court_date).toISOString().slice(0, 16) : '',
          location: board.location || '',
          region: board.region || '서울',
          cost: costValue,
          costInquiry,
          contact: board.contact || '',
          court_size: board.court_size || '',
          court_image: '', // URL 입력은 빈 값으로
          court_image_files: [],
          has_parking: board.has_parking === 1 || board.has_parking === true,
          has_shower: board.has_shower === 1 || board.has_shower === true,
          description: board.content || '',
        });
        setImagePreviews(images);
      }
    } catch (error) {
      console.error('게시글 로드 실패:', error);
      toastError(language === 'KR' ? '게시글을 불러올 수 없습니다.' : 'Failed to load post');
      navigate('/court-board');
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    // 비용 문의 체크박스 처리
    if (name === 'costInquiry') {
      setFormData({
        ...formData,
        costInquiry: checked,
        cost: checked ? '' : formData.cost, // 체크하면 비용 입력 비활성화
      });
      return;
    }

    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const compressImage = (file, maxWidth = 1920, maxHeight = 1920, quality = 0.8) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // 비율 유지하면서 크기 조정
          if (width > height) {
            if (width > maxWidth) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = (width * maxHeight) / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('이미지 압축 실패'));
              }
            },
            'image/jpeg',
            quality
          );
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleImageChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // 최대 10개 이미지 제한
    const currentCount = formData.court_image_files.length + imagePreviews.length;
    if (currentCount + files.length > 10) {
      toastError(
        language === 'KR' ? '이미지는 최대 10개까지 첨부 가능합니다.' : 'Maximum 10 images allowed'
      );
      return;
    }

    const validFiles = [];
    const compressedFiles = [];

    for (const file of files) {
      // 파일 크기 체크 (10MB 제한 - 원본)
      if (file.size > 10 * 1024 * 1024) {
        toastError(
          language === 'KR'
            ? `이미지 크기는 10MB 이하여야 합니다: ${file.name}`
            : `Image size must be less than 10MB: ${file.name}`
        );
        continue;
      }

      // 이미지 파일 타입 체크
      if (!file.type.startsWith('image/')) {
        toastError(
          language === 'KR'
            ? `이미지 파일만 업로드 가능합니다: ${file.name}`
            : `Only image files are allowed: ${file.name}`
        );
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    try {
      // 모든 이미지 압축
      for (const file of validFiles) {
        const compressedFile = await compressImage(file);
        compressedFiles.push(compressedFile);

        // 미리보기 생성
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreviews((prev) => [...prev, reader.result]);
        };
        reader.readAsDataURL(compressedFile);
      }

      setFormData({
        ...formData,
        court_image_files: [...formData.court_image_files, ...compressedFiles],
        court_image: '', // 파일 선택 시 URL 초기화
      });
    } catch (error) {
      console.error('이미지 처리 실패:', error);
      toastError(
        language === 'KR' ? '이미지 처리 중 오류가 발생했습니다.' : 'Error processing image'
      );
    }

    // input 초기화 (같은 파일 다시 선택 가능하도록)
    e.target.value = '';
  };

  const removeImage = (index) => {
    // 기존 URL 이미지인지 새로 추가한 파일인지 확인
    const existingImageCount = imagePreviews.filter((img) => !img.startsWith('data:image')).length;
    const isExistingImage = index < existingImageCount;

    if (isExistingImage) {
      // 기존 URL 이미지 제거
      const newPreviews = imagePreviews.filter((_, i) => i !== index);
      setImagePreviews(newPreviews);
    } else {
      // 새로 추가한 파일 제거
      const fileIndex = index - existingImageCount;
      const newFiles = formData.court_image_files.filter((_, i) => i !== fileIndex);
      const newPreviews = imagePreviews.filter((_, i) => i !== index);

      setFormData({
        ...formData,
        court_image_files: newFiles,
      });
      setImagePreviews(newPreviews);
    }
  };

  // 드래그 시작
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.outerHTML);
  };

  // 드래그 오버
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // 드롭
  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    // 이미지 순서 변경
    const newPreviews = [...imagePreviews];
    const draggedItem = newPreviews[draggedIndex];
    newPreviews.splice(draggedIndex, 1);
    newPreviews.splice(dropIndex, 0, draggedItem);

    // 파일 배열도 동일하게 재정렬
    // 기존 URL 이미지 개수 계산
    const existingImageCount = imagePreviews.filter((img) => !img.startsWith('data:image')).length;
    const newFiles = [...formData.court_image_files];

    // 드래그된 항목이 파일인지 확인
    const isDraggedFile = draggedIndex >= existingImageCount;
    const isDropOnFile = dropIndex >= existingImageCount;

    if (isDraggedFile) {
      // 드래그된 항목이 파일인 경우
      const draggedFileIndex = draggedIndex - existingImageCount;
      const draggedFile = newFiles[draggedFileIndex];
      newFiles.splice(draggedFileIndex, 1);

      if (isDropOnFile) {
        // 드롭 위치도 파일 영역인 경우
        const dropFileIndex = dropIndex - existingImageCount;
        newFiles.splice(dropFileIndex, 0, draggedFile);
      } else {
        // 드롭 위치가 URL 영역인 경우 (파일을 URL 뒤로 이동)
        newFiles.push(draggedFile);
      }
    } else if (isDropOnFile) {
      // 드래그된 항목이 URL이고 드롭 위치가 파일 영역인 경우
      // 파일을 URL 앞으로 이동
      const dropFileIndex = dropIndex - existingImageCount;
      if (dropFileIndex < newFiles.length) {
        const movedFile = newFiles[dropFileIndex];
        newFiles.splice(dropFileIndex, 1);
        newFiles.push(movedFile);
      }
    }

    setImagePreviews(newPreviews);
    setFormData({
      ...formData,
      court_image_files: newFiles,
    });
    setDraggedIndex(null);
  };

  // 드래그 종료
  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 필수 항목 검증
    if (
      !formData.court_date ||
      !formData.location ||
      (!formData.cost && !formData.costInquiry) ||
      !formData.contact ||
      !formData.court_size
    ) {
      toastError(
        language === 'KR' ? '필수 항목을 모두 입력해주세요.' : 'Please fill all required fields'
      );
      return;
    }

    setLoading(true);
    try {
      // 이미지 파일들을 base64로 변환
      const imageUrls = [];

      // 기존 URL 이미지들 추가 (수정 시)
      imagePreviews.forEach((preview) => {
        // base64가 아닌 URL인 경우 (기존 이미지)
        if (preview && !preview.startsWith('data:image')) {
          imageUrls.push(preview);
        }
      });

      // 새로 선택한 파일들을 base64로 변환
      for (const file of formData.court_image_files) {
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        imageUrls.push(base64);
      }

      // URL 입력이 있으면 추가
      if (formData.court_image && formData.court_image.trim()) {
        imageUrls.push(formData.court_image.trim());
      }

      // 비용 처리: 문의 체크박스가 체크되어 있으면 -1, 아니면 입력된 값 또는 0
      const costValue = formData.costInquiry ? -1 : parseInt(formData.cost) || 0;

      const payload = {
        type: formData.type,
        title: formData.location,
        content: formData.description || '',
        court_date: new Date(formData.court_date).toISOString(),
        location: formData.location,
        region: formData.region,
        cost: costValue,
        contact: formData.contact,
        court_size: formData.court_size,
        court_image: imageUrls.length > 0 ? imageUrls : null,
        has_parking: formData.has_parking ? 1 : 0,
        has_shower: formData.has_shower ? 1 : 0,
      };

      if (id) {
        await apiRequest('put', `/court-boards/${id}`, payload);
        toastSuccess(language === 'KR' ? '게시글이 수정되었습니다.' : 'Post updated successfully');
      } else {
        await apiRequest('post', '/court-boards', payload);
        toastSuccess(language === 'KR' ? '게시글이 작성되었습니다.' : 'Post created successfully');
      }

      navigate('/court-board');
    } catch (error) {
      console.error('게시글 저장 실패:', error);
      toastError(
        language === 'KR'
          ? error.response?.data?.message || '게시글 저장 중 오류가 발생했습니다.'
          : error.response?.data?.message || 'Failed to save post'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="court-board-form-page">
      <div className="container">
        <div className="form-header">
          <h1 className="page-title">
            {id
              ? language === 'KR'
                ? '코트대관 수정'
                : 'Edit Court Rental'
              : language === 'KR'
                ? '코트대관 작성'
                : 'Create Court Rental'}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="court-form">
          {/* 유형 선택 (필수) */}
          <div className="form-group">
            <label className="form-label required">{language === 'KR' ? '유형' : 'Type'}</label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="type"
                  value="대관"
                  checked={formData.type === '대관'}
                  onChange={handleChange}
                />
                <span>{language === 'KR' ? '대관' : 'Rental'}</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="type"
                  value="양도"
                  checked={formData.type === '양도'}
                  onChange={handleChange}
                />
                <span>{language === 'KR' ? '양도' : 'Transfer'}</span>
              </label>
            </div>
          </div>

          {/* 일시 (필수) */}
          <div className="form-group">
            <label className="form-label required">
              {language === 'KR' ? '일시' : 'Date & Time'}
            </label>
            <input
              type="datetime-local"
              name="court_date"
              value={formData.court_date}
              onChange={handleChange}
              className="form-input"
              required
            />
          </div>

          {/* 지역 (필수) */}
          <div className="form-group">
            <label className="form-label required">{language === 'KR' ? '지역' : 'Region'}</label>
            <select
              name="region"
              value={formData.region}
              onChange={handleChange}
              className="form-select"
              required
            >
              {regions.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
          </div>

          {/* 장소 (필수) */}
          <div className="form-group">
            <label className="form-label required">{language === 'KR' ? '장소' : 'Location'}</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              className="form-input"
              placeholder={language === 'KR' ? '장소를 입력해주세요' : 'Enter location'}
              required
            />
          </div>

          {/* 비용 (필수) */}
          <div className="form-group">
            <label className="form-label required">
              {language === 'KR' ? '비용' : 'Cost'} ({language === 'KR' ? '원' : 'KRW'})
            </label>
            <div className="cost-input-wrapper">
              <input
                type="number"
                name="cost"
                value={formData.cost}
                onChange={handleChange}
                className="form-input"
                placeholder={language === 'KR' ? '비용을 입력해주세요' : 'Enter cost'}
                min="0"
                disabled={formData.costInquiry}
                required={!formData.costInquiry}
              />
              <label className="checkbox-label cost-inquiry-label">
                <input
                  type="checkbox"
                  name="costInquiry"
                  checked={formData.costInquiry}
                  onChange={handleChange}
                />
                <span>{language === 'KR' ? '문의' : 'Inquiry'}</span>
              </label>
            </div>
          </div>

          {/* 연락처 (필수) */}
          <div className="form-group">
            <label className="form-label required">
              {language === 'KR' ? '연락처' : 'Contact'}
            </label>
            <input
              type="text"
              name="contact"
              value={formData.contact}
              onChange={handleChange}
              className="form-input"
              placeholder={language === 'KR' ? '연락처를 입력해주세요' : 'Enter contact'}
              required
            />
          </div>

          {/* 코트 사이즈 (필수) */}
          <div className="form-group">
            <label className="form-label required">
              {language === 'KR' ? '코트 사이즈' : 'Court Size'}
            </label>
            <input
              type="text"
              name="court_size"
              value={formData.court_size}
              onChange={handleChange}
              className="form-input"
              placeholder={language === 'KR' ? '예)28*15' : 'e.g., 28*15'}
              required
            />
          </div>

          {/* 코트 사진 (선택) */}
          <div className="form-group">
            <label className="form-label">
              {language === 'KR' ? '코트 사진' : 'Court Image'} (
              {language === 'KR' ? '최대 10개' : 'Max 10'})
            </label>

            {/* 이미지 미리보기 그리드 */}
            <div className="image-preview-grid">
              {imagePreviews.map((preview, index) => (
                <div
                  key={index}
                  className={`image-preview-item ${draggedIndex === index ? 'dragging' : ''}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                >
                  <img src={preview} alt={`Preview ${index + 1}`} className="image-preview" />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="btn btn-remove-image"
                    title={language === 'KR' ? '이미지 제거' : 'Remove Image'}
                  >
                    ✕
                  </button>
                  <div
                    className="drag-handle"
                    title={language === 'KR' ? '드래그하여 순서 변경' : 'Drag to reorder'}
                  >
                    ⋮⋮
                  </div>
                </div>
              ))}

              {/* 이미지 추가 버튼 (+ 버튼) */}
              {imagePreviews.length < 10 && (
                <div className="image-add-box">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="image-file-input"
                    id="court-image-upload"
                    multiple
                  />
                  <label htmlFor="court-image-upload" className="image-add-button">
                    <span className="add-icon">+</span>
                    <span className="add-text">
                      {language === 'KR' ? '이미지 추가' : 'Add Image'}
                    </span>
                  </label>
                </div>
              )}
            </div>

            {/* URL 입력 (선택) */}
            {imagePreviews.length < 10 && (
              <div className="image-url-input-wrapper">
                <input
                  type="url"
                  name="court_image"
                  value={formData.court_image}
                  onChange={handleChange}
                  className="form-input"
                  placeholder={language === 'KR' ? '또는 이미지 URL 입력' : 'Or enter image URL'}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && formData.court_image.trim()) {
                      e.preventDefault();
                      const url = formData.court_image.trim();
                      setImagePreviews((prev) => [...prev, url]);
                      setFormData({
                        ...formData,
                        court_image: '',
                      });
                    }
                  }}
                />
                {formData.court_image.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      const url = formData.court_image.trim();
                      setImagePreviews((prev) => [...prev, url]);
                      setFormData({
                        ...formData,
                        court_image: '',
                      });
                    }}
                    className="btn btn-add-url"
                  >
                    {language === 'KR' ? '추가' : 'Add'}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 주차/샤워 (선택) */}
          <div className="form-group">
            <label className="form-label">{language === 'KR' ? '편의 시설' : 'Facilities'}</label>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="has_parking"
                  checked={formData.has_parking}
                  onChange={handleChange}
                />
                <span>{language === 'KR' ? '주차가능' : 'Parking Available'}</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="has_shower"
                  checked={formData.has_shower}
                  onChange={handleChange}
                />
                <span>{language === 'KR' ? '샤워가능' : 'Shower Available'}</span>
              </label>
            </div>
          </div>

          {/* 설명 (선택) */}
          <div className="form-group">
            <label className="form-label">{language === 'KR' ? '설명' : 'Description'}</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="form-textarea"
              rows="5"
              placeholder={
                language === 'KR' ? '추가 설명을 입력해주세요' : 'Enter additional description'
              }
            />
          </div>

          {/* 버튼 */}
          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate('/court-board')}
              className="btn btn-secondary"
            >
              {language === 'KR' ? '취소' : 'Cancel'}
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading
                ? language === 'KR'
                  ? '저장 중...'
                  : 'Saving...'
                : id
                  ? language === 'KR'
                    ? '수정'
                    : 'Update'
                  : language === 'KR'
                    ? '작성'
                    : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CourtBoardForm;
