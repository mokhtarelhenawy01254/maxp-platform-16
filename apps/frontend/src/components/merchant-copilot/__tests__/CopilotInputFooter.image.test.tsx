import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CopilotInputFooter } from '../CopilotInputFooter';

describe('CopilotInputFooter - Image Upload & Paste Controls', () => {
  const defaultProps = {
    inputValue: '',
    setInputValue: jest.fn(),
    loading: false,
    attachedImages: [],
    onRemoveImage: jest.fn(),
    onFileUpload: jest.fn(),
    onPasteImage: jest.fn(),
    onSendMessage: jest.fn(),
    telemetry: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('disables submit button when text is empty and no images are attached', () => {
    render(<CopilotInputFooter {...defaultProps} />);
    const sendButton = screen.getByRole('button', { name: /إرسال/i });
    expect(sendButton).toBeDisabled();
  });

  it('enables submit button when an image is attached even if text input is completely empty', () => {
    render(
      <CopilotInputFooter
        {...defaultProps}
        inputValue=""
        attachedImages={['data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==']}
      />
    );
    const sendButton = screen.getByRole('button', { name: /إرسال/i });
    expect(sendButton).toBeEnabled();
  });

  it('renders attached image thumbnails and allows removal via remove button', () => {
    const onRemoveImage = jest.fn();
    render(
      <CopilotInputFooter
        {...defaultProps}
        attachedImages={['https://maxp.online/uploads/products/image1.jpg']}
        onRemoveImage={onRemoveImage}
      />
    );

    const thumbnail = screen.getByAltText('attached');
    expect(thumbnail).toHaveAttribute('src', 'https://maxp.online/uploads/products/image1.jpg');

    const removeBtn = screen.getByRole('button', { name: /إزالة الصورة/i });
    fireEvent.click(removeBtn);
    expect(onRemoveImage).toHaveBeenCalledWith(0);
  });

  it('triggers onPasteImage when an image file is pasted into the textarea', () => {
    const onPasteImage = jest.fn();
    render(<CopilotInputFooter {...defaultProps} onPasteImage={onPasteImage} />);

    const textarea = screen.getByPlaceholderText(/اكتب استفسارك أو أمرك التشغيلي/i);

    const mockFile = new File(['dummy content'], 'screenshot.png', { type: 'image/png' });
    const clipboardData = {
      items: [
        {
          type: 'image/png',
          getAsFile: () => mockFile,
        },
      ],
    };

    fireEvent.paste(textarea, { clipboardData });

    expect(onPasteImage).toHaveBeenCalledWith([mockFile]);
  });
});
