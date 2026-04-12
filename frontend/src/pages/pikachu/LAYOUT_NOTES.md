# PIKACHU GAME LAYOUT NOTES (cho AI đọc)

## Yêu cầu layout (USER đã xác nhận - 2026-04-12)

### ĐÃ CÀI ĐẶT ĐÚNG:
- **Khung nền (glass-panel)**: Là 1 khối HÌNH CHỮ NHẬT/HÌNH VUÔNG cân đối ở GIỮA màn hình
  - KHÔNG trải rộng full màn hình (không dùng `width: 100%` hay `maxWidth: 1500px`)
  - Dùng `width: fit-content` hoặc fixed px thích hợp
  - Tỉ lệ chiều rộng ≈ chiều cao (cân đối), không bị ngang quá nhiều khoảng trống
  - Luôn có khoảng cách với viền màn hình (padding hoặc margin), KHÔNG bao giờ full màn hình
  - Justify/Align center cả hai chiều

### KHU VỰC CHƠI GAME:
  - Board game phải TO, chiếm phần lớn diện tích khung
  - Phải chơi được thoải mái kể cả màn 2K hay màn hình lớn (không bị quá nhỏ)
  - Dùng `vh` và `vw` thích hợp để scale theo màn hình

### PANEL ĐIỀU KHIỂN (bên phải):
  - Width cố định ~180-220px
  - Không chiếm quá nhiều không gian

### NGUYÊN TẮC CHUNG:
  - KHÔNG BAO GIỜ full màn hình
  - Tối ưu diện tích nhưng vẫn có đủ không gian chơi
  - Container luôn centered, cân đối
  - Khung tổng thể: `min(96vh, 96vw)` kiểu tỉ lệ vuông hoặc giữ tỉ lệ phù hợp với board
