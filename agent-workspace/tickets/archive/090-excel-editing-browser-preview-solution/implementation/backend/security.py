"""
Security module for Excel file processing
Implements validation and sanitization for uploaded Excel files
"""

import os
import mimetypes
import zipfile
from pathlib import Path
from typing import Tuple, Optional
import logging

logger = logging.getLogger(__name__)

class ExcelSecurityValidator:
    """Security validator for Excel files"""

    # Allowed MIME types for Excel files
    ALLOWED_MIME_TYPES = {
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',  # .xlsx
        'application/vnd.ms-excel.sheet.macroEnabled.12',  # .xlsm
        'application/vnd.ms-excel',  # .xls
    }

    # Allowed file extensions
    ALLOWED_EXTENSIONS = {'.xlsx', '.xlsm', '.xls'}

    # Maximum file size (50MB)
    MAX_FILE_SIZE = 50 * 1024 * 1024

    # Suspicious patterns in file names
    SUSPICIOUS_PATTERNS = [
        '../', '..\\', '/etc/', '/var/', 'cmd.exe', 'powershell',
        '<script', 'javascript:', 'vbscript:', 'data:',
    ]

    @classmethod
    def validate_file(cls, file_path: Path, original_filename: str) -> Tuple[bool, Optional[str]]:
        """
        Comprehensive file validation
        Returns (is_valid, error_message)
        """

        # Check file existence
        if not file_path.exists():
            return False, "File does not exist"

        # Check file size
        file_size = file_path.stat().st_size
        if file_size > cls.MAX_FILE_SIZE:
            return False, f"File size ({file_size} bytes) exceeds maximum allowed ({cls.MAX_FILE_SIZE} bytes)"

        if file_size == 0:
            return False, "File is empty"

        # Check filename for suspicious patterns
        filename_lower = original_filename.lower()
        for pattern in cls.SUSPICIOUS_PATTERNS:
            if pattern in filename_lower:
                return False, f"Suspicious pattern detected in filename: {pattern}"

        # Check file extension
        file_extension = Path(original_filename).suffix.lower()
        if file_extension not in cls.ALLOWED_EXTENSIONS:
            return False, f"Invalid file extension: {file_extension}"

        # Check MIME type
        mime_type, _ = mimetypes.guess_type(original_filename)
        if mime_type not in cls.ALLOWED_MIME_TYPES:
            logger.warning(f"Suspicious MIME type: {mime_type} for file: {original_filename}")

        # For .xlsx and .xlsm files, validate ZIP structure
        if file_extension in {'.xlsx', '.xlsm'}:
            is_valid_zip, zip_error = cls._validate_xlsx_structure(file_path)
            if not is_valid_zip:
                return False, f"Invalid Excel file structure: {zip_error}"

        # Additional content validation
        content_valid, content_error = cls._validate_content(file_path, file_extension)
        if not content_valid:
            return False, f"Content validation failed: {content_error}"

        return True, None

    @classmethod
    def _validate_xlsx_structure(cls, file_path: Path) -> Tuple[bool, Optional[str]]:
        """Validate that .xlsx/.xlsm files have proper ZIP structure"""
        try:
            with zipfile.ZipFile(file_path, 'r') as zip_file:
                # Check for required Excel structure
                required_files = ['[Content_Types].xml', '_rels/.rels']
                zip_contents = zip_file.namelist()

                for required_file in required_files:
                    if required_file not in zip_contents:
                        return False, f"Missing required file: {required_file}"

                # Check for suspicious files
                suspicious_extensions = {'.exe', '.bat', '.cmd', '.scr', '.vbs', '.js'}
                for file_name in zip_contents:
                    file_ext = Path(file_name).suffix.lower()
                    if file_ext in suspicious_extensions:
                        return False, f"Suspicious file found in archive: {file_name}"

                # Validate XML content for basic structure
                try:
                    content_types = zip_file.read('[Content_Types].xml')
                    if b'application/vnd.openxmlformats' not in content_types:
                        return False, "Invalid Excel content types"
                except Exception as e:
                    return False, f"Error reading content types: {str(e)}"

        except zipfile.BadZipFile:
            return False, "File is not a valid ZIP archive"
        except Exception as e:
            return False, f"Error validating file structure: {str(e)}"

        return True, None

    @classmethod
    def _validate_content(cls, file_path: Path, file_extension: str) -> Tuple[bool, Optional[str]]:
        """Basic content validation for Excel files"""
        try:
            # Read first few bytes to check file signature
            with open(file_path, 'rb') as f:
                header = f.read(512)

            if file_extension in {'.xlsx', '.xlsm'}:
                # Check for ZIP signature (PK)
                if not header.startswith(b'PK'):
                    return False, "Invalid file signature for Excel file"

            elif file_extension == '.xls':
                # Check for OLE signature
                ole_signature = b'\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1'
                if not header.startswith(ole_signature):
                    return False, "Invalid file signature for legacy Excel file"

            # Check for embedded executables or scripts
            suspicious_signatures = [
                b'MZ',  # PE executable
                b'\x7fELF',  # ELF executable
                b'<script',  # Script tags
                b'javascript:',  # JavaScript protocol
                b'vbscript:',  # VBScript protocol
            ]

            for sig in suspicious_signatures:
                if sig in header:
                    return False, f"Suspicious content detected"

        except Exception as e:
            return False, f"Error reading file content: {str(e)}"

        return True, None

    @classmethod
    def sanitize_filename(cls, filename: str) -> str:
        """Sanitize filename to prevent path traversal"""
        # Remove path components
        filename = os.path.basename(filename)

        # Remove or replace dangerous characters
        dangerous_chars = '<>:"/\\|?*'
        for char in dangerous_chars:
            filename = filename.replace(char, '_')

        # Limit filename length
        if len(filename) > 255:
            name, ext = os.path.splitext(filename)
            filename = name[:250 - len(ext)] + ext

        return filename

    @classmethod
    def get_safe_session_filename(cls, session_id: str, original_filename: str) -> str:
        """Generate a safe filename for storage"""
        sanitized_name = cls.sanitize_filename(original_filename)
        return f"{session_id}_{sanitized_name}"


# Security headers middleware
SECURITY_HEADERS = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
}

def add_security_headers(response):
    """Add security headers to response"""
    for header, value in SECURITY_HEADERS.items():
        response.headers[header] = value
    return response