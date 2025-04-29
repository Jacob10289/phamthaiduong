from flask import Flask, render_template

app = Flask(__name__)

# Dữ liệu mẫu - danh sách bài viết
posts = [
    {
        'title': 'Mùa thu của Nguyễn Khuyến',
        'author': 'admin',
        'content': 'Bài thơ nổi tiếng với hình ảnh ao thu trong trẻo...',
    },
    {
        'title': 'Chiếc thuyền ngoài xa - Nguyễn Minh Châu',
        'author': 'user1',
        'content': 'Tác phẩm phản ánh hiện thực và chiều sâu của nghệ thuật...',
    }
]

@app.route('/')
def index():
    return render_template('index.html', posts=posts)

if __name__ == '__main__':
    app.run(debug=True)
