import React from "react";

type GenericProps = React.HTMLAttributes<HTMLElement> & {
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  render?: React.ReactElement;
};

const DialogOpenContext = React.createContext(false);

const Root = ({
  children,
  open,
}: GenericProps) => (
  <DialogOpenContext.Provider value={Boolean(open)}>
    <div data-testid="mock-dialog-root">{children}</div>
  </DialogOpenContext.Provider>
);

const Trigger = React.forwardRef<HTMLButtonElement, GenericProps>(
  ({ children, ...props }, ref) => (
    <button ref={ref} type="button" {...props}>
      {children}
    </button>
  ),
);

const Close = React.forwardRef<HTMLElement, GenericProps>(
  ({ children, render, ...props }, ref) => {
    if (React.isValidElement(render)) {
      return React.cloneElement(render, {
        ...props,
        ref,
        children: (
          <>
            {render.props.children}
            {children}
          </>
        ),
      });
    }

    return (
      <button ref={ref as React.Ref<HTMLButtonElement>} type="button" {...props}>
        {children}
      </button>
    );
  },
);

const Portal = ({ children }: GenericProps) => <>{children}</>;

const Backdrop = React.forwardRef<HTMLDivElement, GenericProps>(
  ({ children, ...props }, ref) => {
    const isOpen = React.useContext(DialogOpenContext);

    if (!isOpen) {
      return null;
    }

    return (
      <div ref={ref} {...props}>
        {children}
      </div>
    );
  },
);

const Popup = React.forwardRef<HTMLDivElement, GenericProps>(
  ({ children, ...props }, ref) => {
    const isOpen = React.useContext(DialogOpenContext);

    if (!isOpen) {
      return null;
    }

    return (
      <div ref={ref} role="dialog" {...props}>
        {children}
      </div>
    );
  },
);

const Title = React.forwardRef<HTMLHeadingElement, GenericProps>(
  ({ children, ...props }, ref) => (
    <h2 ref={ref} {...props}>
      {children}
    </h2>
  ),
);

const Description = React.forwardRef<HTMLParagraphElement, GenericProps>(
  ({ children, ...props }, ref) => (
    <p ref={ref} {...props}>
      {children}
    </p>
  ),
);

Trigger.displayName = "MockDialogTrigger";
Close.displayName = "MockDialogClose";
Backdrop.displayName = "MockDialogBackdrop";
Popup.displayName = "MockDialogPopup";
Title.displayName = "MockDialogTitle";
Description.displayName = "MockDialogDescription";

export const Dialog = {
  Root,
  Trigger,
  Close,
  Portal,
  Backdrop,
  Popup,
  Title,
  Description,
};

export default { Dialog };
