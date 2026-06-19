@echo off
echo Activating virtual environment...
call venv\Scripts\activate.bat
echo Virtual environment activated!
echo.
echo You can now run:
echo   - python manage.py runserver
echo   - python manage.py populate_fake_data
echo   - python manage.py migrate
echo.
