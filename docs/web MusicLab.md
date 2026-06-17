### **I. MÔ TẢ BÀI TOÁN**

Theo như em khảo sát, nhu cầu sáng tác và sản xuất âm nhạc kỹ thuật số đang ngày càng phổ biến. Các phần mềm làm nhạc truyền thống (như FL Studio, Ableton Live) tuy mạnh mẽ nhưng mang nhiều hạn chế: yêu cầu cài đặt phức tạp, đòi hỏi cấu hình phần cứng máy tính cao, trả phí bản quyền đắt đỏ và thiếu đi tính năng cộng tác (làm việc nhóm) trực tuyến theo thời gian thực.

Trên thế giới đã xuất hiện một số giải pháp Web-DAW (như BandLab, Soundtrap), chứng minh được tính khả thi của việc xử lý âm thanh trực tiếp trên trình duyệt. Tuy nhiên, việc tối ưu hóa luồng dữ liệu lớn và trải nghiệm biên tập mượt mà (không giật lag) vẫn là một bài toán kỹ thuật đầy thách thức.

Từ thực tế đó, em đã lên ý tưởng xây dựng một nền tảng Web-DAW cơ bản (MVP) mang tên **MusicLab (MusLab)**. Hệ thống cho phép người dùng (Creator) tải lên các mẫu âm thanh, sắp xếp trên dòng thời gian (Timeline), chỉnh sửa hiệu ứng (Mixer) và đặc biệt là có khả năng chia sẻ không gian làm việc để cộng tác trực tuyến ngay trên trình duyệt mà không cần cài đặt phần mềm.

### **II. MỤC TIÊU WEBSITE**

**Mục tiêu chính:**

* Tạo ra một môi trường Studio âm nhạc thu nhỏ hoạt động trực tiếp trên nền tảng Web, tập trung vào tính ổn định của luồng dữ liệu và trải nghiệm biên tập mượt mà.  
* Xây dựng một hệ thống kiến trúc tối ưu (Modular Monolithic) để quản lý trơn tru các cấu trúc dữ liệu bản nhạc (JSON) phức tạp và giải quyết được nút thắt hiệu năng khi xuất file âm thanh.

**Mục tiêu cụ thể:**

* Người dùng có thể đăng ký, quản lý kho tài nguyên âm thanh cá nhân.  
* Trình biên tập hỗ trợ đa luồng (Multi-track) cho phép cắt, ghép, di chuyển các đoạn nhạc (Clips) linh hoạt.  
* Cung cấp bộ trộn âm thanh (Mixer) cơ bản để điều chỉnh âm lượng, độ cân bằng (Pan) và các hiệu ứng.  
* Hỗ trợ tính năng mời thành viên khác vào dự án để cùng xem (Viewer) hoặc cùng chỉnh sửa (Editor).

### **III. XÁC ĐỊNH PHẠM VI**

Dựa trên nguồn lực hiện tại, hệ thống MVP sẽ tập trung vào 2 phân hệ (Site) cốt lõi:

| Phân hệ | Mô tả | Chi tiết |
| :---- | :---- | :---- |
| **Thư viện (Library)** | Quản lý tài nguyên và trạng thái | Quản lý tệp cá nhân (Assets upload), lưu trữ phiên bản nháp (Project State), tích hợp kho mẫu âm thanh có sẵn (Sample Library). |
| **Trình biên tập (Studio Editor)** | Khu vực làm việc & Xử lý âm thanh | Giao diện Timeline đa luồng, hỗ trợ kéo thả, cắt ghép. Tích hợp bộ trộn âm lượng và chuỗi hiệu ứng (Mixer & FX Chain). |

### **IV. DANH SÁCH ACTOR (Các tác nhân hệ thống)**

| Actor | Mô tả |
| :---- | :---- |
| **Guest** | Người dùng vãng lai chưa đăng nhập. Chỉ xem được trang chủ giới thiệu tính năng. |
| **Creator** | Người làm nhạc (đã đăng nhập). Có quyền tạo dự án, tải lên tài nguyên, biên tập nhạc và mời người khác vào dự án của mình. |
| **Admin** | Quản trị viên hệ thống. Toàn quyền quản lý dữ liệu người dùng, theo dõi logs vi phạm và khóa tài khoản khi cần thiết. |

### **V. DANH SÁCH CHỨC NĂNG CHÍNH, TÍNH NĂNG CỐT LÕI (MVP)**

**Nhóm 1: Quản lý tài khoản và Hệ thống**

* Đăng ký, đăng nhập an toàn.  
* Quản lý thông tin cá nhân và theo dõi hạn mức lưu trữ (Storage Quota).

**Nhóm 2: Quản lý thư viện tài nguyên (Assets)**

* Upload các tệp âm thanh định dạng .mp3, .wav lên hệ thống lưu trữ Cloud.  
* Xem danh sách, nghe thử và xóa các tài nguyên đã tải lên.

**Nhóm 3: Trình biên tập Studio (Timeline Editor)**

* Tạo dự án mới, lưu và tải lại trạng thái dự án (project\_state dạng JSON).  
* Kéo thả tệp âm thanh từ Library vào Timeline.  
* Cắt (Split), ghép (Join), và di chuyển các vùng nhạc (Clips) trên nhiều Track khác nhau.

**Nhóm 4: Bộ trộn và Hiệu ứng (Mixer & FX)**

* Điều chỉnh âm lượng tổng và âm lượng từng Track riêng biệt.  
* Tích hợp các bộ lọc xử lý âm thanh thời gian thực (EQ, Reverb cơ bản).  
* Render/Xuất file nhạc thành phẩm.

**Nhóm 5: Cộng tác và Chia sẻ**

* Mời thành viên khác vào dự án thông qua Email/Username.  
* Phân quyền truy cập dự án (Viewer \- Chỉ xem / Editor \- Được phép chỉnh sửa).

**Nhóm 6: Quản trị (Admin)**

* Quản lý danh sách tài khoản Creator.  
* Cảnh cáo, khóa/mở khóa tài khoản người dùng và ghi nhận vào Admin Logs.

### **VI. SƠ ĐỒ CHỨC NĂNG TỔNG QUÁT**

**Website Web-DAW (MusicLab)**

**1\. QUẢN LÝ TÀI KHOẢN**

* Đăng ký / Đăng nhập / Đăng xuất  
* Xem thông tin & Dung lượng lưu trữ

**2\. THƯ VIỆN & TÀI NGUYÊN (LIBRARY)**

* Upload file âm thanh (.wav, .mp3)  
* Quản lý Assets (Nghe thử, xóa tệp)  
* Xem danh sách Dự án (Recent Projects)

**3\. STUDIO EDITOR (TRÌNH BIÊN TẬP)**

* Quản lý Track (Thêm, xóa, mute, solo)  
* Thao tác Clip (Kéo thả, cắt ghép, dịch chuyển trên Timeline)  
* Vẽ biểu đồ sóng âm (Waveform)

**4\. MIXER & RENDER**

* Điều chỉnh Volume & Pan  
* Render nhạc (Mix-down các track thành file Audio)

**5\. CỘNG TÁC DỰ ÁN**

* Chia sẻ dự án & Phân quyền (Viewer/Editor)  
* Đồng bộ thao tác chỉnh sửa

**6\. ADMIN DASHBOARD**

* System Overview (Thống kê)  
* User Management (Khóa/Mở khóa tài khoản)  
* System Logs (Lịch sử thao tác quản trị)

### **VII. CÔNG NGHỆ ĐÃ CHỌN**

* **Frontend:** ReactJS (Vite) \+ Tailwind CSS (Tối ưu giao diện Editor linh hoạt, re-render nhanh).  
* **Audio Engine:** Web Audio API & Wavesurfer.js (Xử lý tín hiệu âm thanh và vẽ sóng âm trực quan).  
* **Backend:** Node.js \+ ExpressJS (Kiến trúc Modular Monolithic kết hợp Background Worker xử lý tác vụ nặng).  
* **Database:** PostgreSQL (Hỗ trợ kiểu JSONB lưu trữ project\_state cực kỳ tối ưu).  
* **Khác:** Redis (Quản lý hàng đợi tác vụ Render âm thanh) & Nginx (Web Server Proxy).

