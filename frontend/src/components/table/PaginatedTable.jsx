import { useState } from 'react';

const PaginatedTable = ({
  columns,
  data,
  rowCountOptions = [10, 20, 30, 50, 100],
  defaultRowCount = 10,
  className,
  caution,
}) => {
  const [rowCount, setRowCount] = useState(defaultRowCount);
  const [currentPage, setCurrentPage] = useState(1);

  // 페이지 계산
  let totalPages = 0;
  let displayData = 0;
  if (data && data.length > 0) {
    totalPages = Math.ceil(data.length / rowCount);
    displayData = data.slice((currentPage - 1) * rowCount, currentPage * rowCount);
  }

  // 페이지 이동 함수
  const goToPage = (page) => {
    if (page < 1) page = 1;
    if (page > totalPages) page = totalPages;
    setCurrentPage(page);
  };

  return (
    <div className={`table-container ${className || ''}`}>
      {/* 행 개수 선택 */}
      <div className="controls">
        <label>행 개수:</label>
        <select
          value={rowCount}
          onChange={(e) => {
            setRowCount(Number(e.target.value));
            setCurrentPage(1);
          }}
        >
          {rowCountOptions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      {/* 테이블 */}
      <table border="1" cellSpacing="0" cellPadding="5">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                style={{ width: col.width || 'auto', textAlign: col.align || 'left' }}
              >
                {col.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayData.length > 0 ? (
            displayData.map((row, idx) => (
              <tr key={idx}>
                {columns.map((col) => (
                  <td
                    key={col.key}
                    style={{ width: col.width || 'auto', textAlign: col.align || 'left' }}
                  >
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td>{caution}</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* 페이지네이션 */}
      <div className="pagination" style={{ marginTop: '10px' }}>
        <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>
          이전
        </button>
        <span style={{ margin: '0 10px' }}>
          {currentPage} / {totalPages}
        </span>
        <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}>
          다음
        </button>
      </div>
    </div>
  );
};

export default PaginatedTable;
