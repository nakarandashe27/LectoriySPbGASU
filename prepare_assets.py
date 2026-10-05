from pathlib import Path
from PIL import Image
from reportlab.graphics.barcode.qrencoder import QRCode, QRErrorCorrectLevel
import subprocess
import shutil

ROOT = Path(__file__).resolve().parent
PROJECT = ROOT.parent
ASSETS = ROOT / 'assets'
(ASSETS / 'posters').mkdir(parents=True, exist_ok=True)
(ASSETS / 'qr').mkdir(parents=True, exist_ok=True)

videos = {
    'sintez': 'SINTEZ/guide_1080p.mp4',
    'gh': 'Script Grasshopper Natalia/Скрипт для подсчета ГНС/Скрипт для подсчета ГНС.mp4',
    'rhino': 'Rhino MCP/БЦ СЕНАТОР кейс.mp4',
    'revit': 'REVIT MCP/final_v3.mp4',
    'rhighai': 'RhiGhAI plugin/manege-rhighai-presentation.mp4',
    'villa': 'villa savoye/villa-savoye-16x9-v3.mp4',
    'game': 'PROrest GAME/prorestavraciya-96s.mp4',
    'artmap': 'artmap screencast/brag.mp4',
}
for name, video in videos.items():
    second = {'sintez': 45, 'gh': 48, 'rhino': 24, 'revit': 30, 'rhighai': 51, 'villa': 10, 'game': 35, 'artmap': 15}[name]
    subprocess.run(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', '-ss', str(second), '-i', str(PROJECT/video), '-frames:v', '1', '-vf', 'scale=1280:-1', '-q:v', '2', str(ASSETS/'posters'/f'{name}.jpg')], check=True)

for name, source in {
    'sintez.svg': 'context/media/SINTEZ/sintez-referral-qr.svg',
    'game-web.svg': 'context/media/prorest-game/game-web-qr.svg',
    'game-telegram.svg': 'context/media/prorest-game/game-telegram-qr.svg',
}.items():
    shutil.copyfile(PROJECT/source, ASSETS/'qr'/name)

for name, url in {'yaroslav':'https://t.me/na_karandashe27', 'natalia':'https://t.me/postcardby', 'school':'https://t.me/artbrodsky', 'intensive':'https://forms.yandex.ru/u/6abfa1a884227c8d53a4ab7e'}.items():
    code = QRCode(None, QRErrorCorrectLevel.Q)
    code.addData(url)
    code.make()
    n = code.getModuleCount()
    size = (n+8)*12
    image = Image.new('RGB', (size, size), 'white')
    from PIL import ImageDraw
    draw = ImageDraw.Draw(image)
    for row in range(n):
        for col in range(n):
            if code.isDark(row, col):
                x, y = (col+4)*12, (row+4)*12
                draw.rectangle((x,y,x+11,y+11), fill='black')
    image.save(ASSETS/'qr'/f'{name}.png')
print('Prepared 8 video posters and 7 QR codes.')
