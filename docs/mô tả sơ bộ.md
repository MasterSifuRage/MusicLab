# **VI. ĐỀ XUẤT KIẾN TRÚC HỆ THỐNG TỰ XÂY DỰNG**

Dựa trên kết quả khảo sát 5 hệ thống Web-DAW, em đề xuất kiến trúc hệ thống tự xây dựng tập trung vào tính ổn định của luồng dữ liệu và trải nghiệm biên tập mượt mà. Hệ thống được module hóa theo lộ trình từ nền tảng đến nâng cao.

### **6.1 Site Thư viện và Quản lý tài nguyên (Library & Track Management)**

Đây là tầng dữ liệu cơ sở, đóng vai trò lưu trữ và phân loại tài nguyên trước khi đưa vào sản xuất.

* **Hệ thống quản lý Track (Track Manager):** Lưu trữ thông tin định danh cho từng tệp âm thanh (ID, Name, Duration, Format).  
* **Kho mẫu âm thanh (Sample Library):** Tích hợp sẵn các bộ Loop và One-shot (Kick, Snare, Hi-hat) giúp Creator bắt đầu dự án nhanh chóng mà không cần dữ liệu ngoại vi.  
* **Quản lý tệp cá nhân (Creator Assets):** Chức năng cho phép Creator tải lên (Upload) các bản thu âm hoặc mẫu âm thanh riêng và quản lý chúng theo cấu trúc thư mục đám mây.  
* **Trạng thái dự án (Project State):** Lưu trữ các phiên bản nháp (Drafts), cho phép Creator quản lý danh sách các bài nhạc đang thực hiện.

### **6.2 Site Trình biên tập Studio (Studio Editor)**

Đây là khu vực làm việc chính, nơi các thuật toán xử lý âm thanh thời gian thực được vận hành.

* **Timeline Editor:** Giao diện dòng thời gian hỗ trợ đa luồng (Multi-track). Creator có thể kéo thả các đoạn nhạc từ Library vào Timeline, thực hiện cắt (Split), ghép (Join) và di chuyển các vùng nhạc (Clips).  
* **Piano Roll & MIDI Grid:** Trình biên tập nốt nhạc trực quan, cho phép Creator vẽ giai điệu và lập trình nhịp điệu (Drum patterns) trực tiếp trên trình duyệt.  
* **Bộ trộn và Chuỗi hiệu ứng (Mixer & FX Chain):** Thiết kế bảng điều khiển âm lượng, cân bằng loa (Pan) cho từng track và khả năng nối tầng các bộ lọc xử lý (Reverb, Delay, EQ) tương tự mô hình của Soundation.


### **6.4 Đặc tả giải pháp công nghệ**

| Thành phần | Công nghệ lựa chọn | Vai trò kỹ thuật |
| :---- | :---- | :---- |
| **Frontend** | ReactJS / Tailwind CSS | Xây dựng UI linh hoạt, đáp ứng tốc độ phản hồi cao. |
| **Audio Engine** | Web Audio API & Tone.js | Xử lý tín hiệu âm thanh tầng thấp và quản lý luồng phát. |
| **Backend** | NodeJS, JavaScript | Xử lý logic nghiệp vụ và quản lý API cho Library. |
| **Database** | PostgreSQL | Lưu trữ Metadata dự án và tệp tin âm thanh thô (.wav, .mp3). |

# **VII. Tổng kết kiến trúc và Stack công nghệ áp dụng**

Trải qua quá trình khảo sát, phân tích ưu nhược điểm của các ngôn ngữ, framework, hệ quản trị cơ sở dữ liệu và các mô hình kiến trúc hệ thống hiện đại, đồ án đã đưa ra những lựa chọn công nghệ bám sát nhất với đặc thù của một hệ thống Web-DAW.

Bài toán cốt lõi của dự án là phải xử lý mượt mà giao diện biên tập âm thanh phức tạp, lưu trữ trạng thái dự án linh hoạt, hỗ trợ cộng tác thời gian thực và giải quyết được nút thắt hiệu năng khi xuất file nhạc. Để đáp ứng các yêu cầu khắt khe này, hệ thống sẽ được xây dựng dựa trên Stack công nghệ và Kiến trúc tổng thể như sau:

## **1\. Tổng hợp Stack công nghệ**

Hệ thống sử dụng hệ sinh thái JavaScript/TypeScript làm ngôn ngữ chủ đạo xuyên suốt từ Frontend đến Backend (Full-stack JS), kết hợp với sức mạnh của cơ sở dữ liệu lai quan hệ \- tài liệu.

| Lớp hệ thống | Công nghệ / Công cụ áp dụng | Lý do lựa chọn |
| :---- | :---- | :---- |
| **Ngôn ngữ lập trình** | JavaScript & TypeScript | Đồng bộ mã nguồn hai phía Client-Server, tận dụng hệ sinh thái đa phương tiện mạnh mẽ của web, đảm bảo tính chặt chẽ về kiểu dữ liệu. |
| **Frontend Framework** | ReactJS | Tối ưu hóa việc cập nhật giao diện Editor thông qua Virtual DOM; hệ sinh thái phong phú hỗ trợ tốt các thao tác kéo-thả Drag & Drop. |
| **Xử lý Đa phương tiện** | Web Audio API & Wavesurfer.js | Giao tiếp trực tiếp với phần cứng để xử lý âm lượng, hiệu ứng (FX) và vẽ biểu đồ sóng âm waveform trực quan trên trình duyệt. |
| **Backend Framework** | Node.js (với Express.js) | Kiến trúc Non-blocking I/O và Event-driven xử lý xuất sắc các luồng kết nối WebSockets phục vụ tính năng Mời cộng tác, Chia sẻ dự án. |
| **Cơ sở dữ liệu** | PostgreSQL | Đảm bảo tính toàn vẹn dữ liệu chuẩn RDBMS, đồng thời cung cấp kiểu dữ liệu JSONB để lưu trữ trọn vẹn toàn bộ cấu trúc dự án (project\_state) siêu tốc. |
| **Hàng đợi (Message Queue)** | Redis (kết hợp BullMQ) | Quản lý hàng đợi các tác vụ nặng (như Render âm thanh), đóng vai trò làm trạm trung chuyển dữ liệu giữa máy chủ chính và Worker. |
| **Web Server** | Nginx | Đóng vai trò Reverse Proxy bảo mật hệ thống, hỗ trợ nâng cấp kết nối WebSockets mượt mà và phân phối file tĩnh Frontend tốc độ cao. |

## 

## **2\. Tổng kết Mô hình Kiến trúc hệ thống**

Dự án áp dụng mô hình kiến trúc Modular Monolithic kết hợp Background Worker.

* Khối Modular Monolithic: Đảm nhiệm toàn bộ logic xử lý API CRUD Người dùng, Dự án, Tài nguyên và duy trì kết nối thời gian thực. Mã nguồn được phân chia thành các thư mục module độc lập (auth, projects, assets, collaboration), đảm bảo tiêu chí dễ bảo trì, dễ sửa lỗi, tránh tình trạng rối code nhưng không làm phức tạp hóa khâu vận hành triển khai như Microservices.  
* Khối Background Worker: Được bóc tách hoàn toàn khỏi luồng xử lý chính. Nhiệm vụ duy nhất của khối này là lắng nghe hàng đợi để nhận lệnh và thực thi các tác vụ tiêu tốn nhiều CPU như Mix-down và Render file nhạc gốc. Điều này đảm bảo Server chính luôn trong trạng thái rảnh rỗi để phục vụ tương tác của hàng ngàn người dùng khác.

