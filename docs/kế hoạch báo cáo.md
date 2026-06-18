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

### **VIII. Kế hoạch báo cáo tiến độ hàng tuần (Giai đoạn Triển khai)**

**Tuần 1: Khởi tạo hạ tầng và Cơ sở dữ liệu (Infrastructure & Database)**

* **Mục tiêu:** Hoàn thiện bộ khung sườn cơ bản cho toàn bộ hệ thống.  
* **Nội dung báo cáo cho giảng viên:**  
  * Đã thiết lập xong kho lưu trữ mã nguồn (Git/GitHub).  
  * Đã khởi tạo thành công cấu trúc Backend Node.js theo chuẩn Modular Monolithic (chia sẵn các thư mục `auth`, `projects`, `assets`).  
  * Đã kết nối thành công với PostgreSQL và chạy script tạo 5 bảng CSDL (Users, Projects, Assets, Project\_Members, Admin\_Logs).  
  * *Kết quả/Minh chứng:* Ảnh chụp cấu trúc thư mục, ảnh chụp các bảng trong database đã được tạo thành công.

**Tuần 2: Xây dựng Module cốt lõi và Giao diện tĩnh (Core API & Static UI)**

* **Mục tiêu:** Hệ thống có thể đăng nhập và hiển thị được khung giao diện.  
* **Nội dung báo cáo cho giảng viên:**  
  * *Backend:* Hoàn thành API Đăng ký, Đăng nhập (sử dụng JWT) và phân quyền cơ bản. Viết xong API tạo dự án mới.  
  * *Frontend:* Dựng xong giao diện tĩnh bằng ReactJS \+ Tailwind CSS cho trang Chủ (Home), Đăng nhập (Auth) và Bảng điều khiển (Dashboard).  
  * *Kết quả/Minh chứng:* Demo Postman gọi API thành công; giao diện React hiển thị danh sách "Recent Projects" giả lập.

**Tuần 3: Phát triển Trình biên tập âm thanh (Studio Editor & Audio Engine)**

* **Mục tiêu:** Chạm vào phần "linh hồn" của đồ án \- giao diện làm nhạc.  
* **Nội dung báo cáo cho giảng viên:**  
  * Đã tích hợp thành công thư viện Wavesurfer.js vào ReactJS.  
  * Dựng được giao diện Timeline đa luồng (Multi-track) cơ bản.  
  * Thực hiện được thao tác kéo thả (Drag & Drop) một tệp âm thanh vào Timeline và phát nhạc thành công (sử dụng Web Audio API).  
  * *Kết quả/Minh chứng:* Video quay màn hình thao tác kéo thả và phát âm thanh trên trình duyệt.

**Tuần 4: Đồng bộ trạng thái và Quản lý tài nguyên (State Management & Assets)**

* **Mục tiêu:** Lưu trữ được công sức làm nhạc của người dùng.  
* **Nội dung báo cáo cho giảng viên:**  
  * *Backend:* Hoàn thành API Upload file âm thanh (lưu file và ghi dữ liệu vào bảng `assets`).  
  * *Full-stack:* Xây dựng logic bắt sự kiện trên Timeline (vị trí clip, độ dài) và đóng gói thành chuỗi JSON. Gửi thành công chuỗi JSON này xuống cập nhật vào trường `project_state` trong PostgreSQL.  
  * *Kết quả/Minh chứng:* Demo người dùng thay đổi vị trí đoạn nhạc, F5 tải lại trang và hệ thống vẫn giữ nguyên cấu trúc bản nhạc.

**Tuần 5: Tích hợp nâng cao và Hoàn thiện Báo cáo cuối kỳ**

* **Mục tiêu:** Ghép nối các chức năng, gỡ lỗi (Fix bugs) và chuẩn bị bảo vệ.  
* **Nội dung báo cáo cho giảng viên:**  
  * Tích hợp Mixer cơ bản (chỉnh âm lượng tổng, âm lượng từng track).  
  * Rà soát lại toàn bộ luồng Use Case, xử lý các lỗi phát sinh (Edge cases).  
  * Hoàn thiện quyển báo cáo tổng kết đồ án, đối chiếu lại với bản GR1 xem có thay đổi gì về thiết kế so với lúc code thực tế không.  
  * *Kết quả/Minh chứng:* Sản phẩm MVP hoàn chỉnh, Video Demo toàn bộ luồng hệ thống, Slide thuyết trình.

