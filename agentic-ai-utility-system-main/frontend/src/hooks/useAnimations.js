import { useEffect, useRef, useCallback, useState } from 'react';

// Hook for intersection observer animations
export const useIntersectionAnimation = (options = {}) => {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (options.once !== false) {
            observer.unobserve(entry.target);
          }
        } else if (options.once === false) {
          setIsVisible(false);
        }
      },
      {
        threshold: options.threshold || 0.1,
        rootMargin: options.rootMargin || '0px',
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [options.once, options.threshold, options.rootMargin]);

  return [ref, isVisible];
};

// Hook for scroll-triggered parallax
export const useParallax = (speed = 0.5) => {
  const ref = useRef(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (ref.current) {
        const rect = ref.current.getBoundingClientRect();
        const scrolled = window.scrollY;
        const rate = scrolled * speed;
        setOffset(rate);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [speed]);

  return [ref, offset];
};

// Hook for number counting animation
export const useCountUp = (end, duration = 2000, start = 0) => {
  const [count, setCount] = useState(start);
  const [isAnimating, setIsAnimating] = useState(false);
  const frameRef = useRef();

  const startAnimation = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);
    
    const startTime = performance.now();
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-out-cubic)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentCount = Math.floor(start + (end - start) * easeOut);
      
      setCount(currentCount);
      
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
      }
    };
    
    frameRef.current = requestAnimationFrame(animate);
  }, [end, duration, start, isAnimating]);

  useEffect(() => {
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  return { count, startAnimation, isAnimating };
};

// Hook for ripple effect
export const useRipple = () => {
  const createRipple = useCallback((event) => {
    const button = event.currentTarget;
    const circle = document.createElement('span');
    const diameter = Math.max(button.clientWidth, button.clientHeight);
    const radius = diameter / 2;

    const rect = button.getBoundingClientRect();
    
    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${event.clientX - rect.left - radius}px`;
    circle.style.top = `${event.clientY - rect.top - radius}px`;
    circle.classList.add('ripple-effect');

    const ripple = button.getElementsByClassName('ripple-effect')[0];
    if (ripple) {
      ripple.remove();
    }

    button.appendChild(circle);
  }, []);

  return createRipple;
};

// Hook for swipe gestures
export const useSwipe = (options = {}) => {
  const ref = useRef(null);
  const [swipeDirection, setSwipeDirection] = useState(null);
  const touchStart = useRef({ x: 0, y: 0 });
  const touchEnd = useRef({ x: 0, y: 0 });

  const minSwipeDistance = options.minDistance || 50;

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const onTouchStart = (e) => {
      touchStart.current = {
        x: e.targetTouches[0].clientX,
        y: e.targetTouches[0].clientY,
      };
    };

    const onTouchMove = (e) => {
      touchEnd.current = {
        x: e.targetTouches[0].clientX,
        y: e.targetTouches[0].clientY,
      };
    };

    const onTouchEnd = () => {
      const dx = touchEnd.current.x - touchStart.current.x;
      const dy = touchEnd.current.y - touchStart.current.y;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (Math.max(absDx, absDy) > minSwipeDistance) {
        if (absDx > absDy) {
          // Horizontal swipe
          const direction = dx > 0 ? 'right' : 'left';
          setSwipeDirection(direction);
          options.onSwipe?.(direction);
        } else {
          // Vertical swipe
          const direction = dy > 0 ? 'down' : 'up';
          setSwipeDirection(direction);
          options.onSwipe?.(direction);
        }
      }

      // Reset after a delay
      setTimeout(() => setSwipeDirection(null), 100);
    };

    element.addEventListener('touchstart', onTouchStart, { passive: true });
    element.addEventListener('touchmove', onTouchMove, { passive: true });
    element.addEventListener('touchend', onTouchEnd);

    return () => {
      element.removeEventListener('touchstart', onTouchStart);
      element.removeEventListener('touchmove', onTouchMove);
      element.removeEventListener('touchend', onTouchEnd);
    };
  }, [minSwipeDistance, options]);

  return [ref, swipeDirection];
};

// Hook for staggered children animation
export const useStagger = (itemCount, baseDelay = 50) => {
  const getDelay = useCallback((index) => {
    return index * baseDelay;
  }, [baseDelay]);

  const getStaggerStyle = useCallback((index) => ({
    animationDelay: `${getDelay(index)}ms`,
  }), [getDelay]);

  return { getDelay, getStaggerStyle };
};

// Hook for magnetic button effect
export const useMagnetic = (strength = 0.3) => {
  const ref = useRef(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleMouseMove = (e) => {
      const rect = element.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const deltaX = (e.clientX - centerX) * strength;
      const deltaY = (e.clientY - centerY) * strength;

      element.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
    };

    const handleMouseLeave = () => {
      element.style.transform = 'translate(0, 0)';
      element.style.transition = 'transform 0.3s ease-out';
    };

    const handleMouseEnter = () => {
      element.style.transition = 'transform 0.1s ease-out';
    };

    element.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('mouseleave', handleMouseLeave);
    element.addEventListener('mouseenter', handleMouseEnter);

    return () => {
      element.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('mouseleave', handleMouseLeave);
      element.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, [strength]);

  return ref;
};

// Hook for text scramble effect
export const useTextScramble = (finalText, duration = 1000) => {
  const [displayText, setDisplayText] = useState(finalText);
  const [isScrambling, setIsScrambling] = useState(false);
  const chars = '!<>-_\\/[]{}—=+*^?#________';

  const scramble = useCallback(() => {
    if (isScrambling) return;
    setIsScrambling(true);
    
    let iteration = 0;
    const totalIterations = finalText.length * 3;
    
    const interval = setInterval(() => {
      setDisplayText(
        finalText
          .split('')
          .map((char, index) => {
            if (char === ' ') return ' ';
            if (index < iteration / 3) {
              return finalText[index];
            }
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join('')
      );

      iteration += 1;

      if (iteration >= totalIterations) {
        clearInterval(interval);
        setDisplayText(finalText);
        setIsScrambling(false);
      }
    }, duration / totalIterations);

    return () => clearInterval(interval);
  }, [finalText, duration, isScrambling]);

  return { displayText, scramble, isScrambling };
};

// Hook for smooth scroll to element
export const useSmoothScroll = () => {
  const scrollTo = useCallback((elementId, offset = 0) => {
    const element = document.getElementById(elementId);
    if (element) {
      const top = element.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({
        top,
        behavior: 'smooth',
      });
    }
  }, []);

  return scrollTo;
};

// Hook for typing effect
export const useTypewriter = (text, speed = 50, delay = 0) => {
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    let timeout;
    
    const startTyping = () => {
      setIsTyping(true);
      let index = 0;
      
      const type = () => {
        if (index < text.length) {
          setDisplayText(text.slice(0, index + 1));
          index++;
          timeout = setTimeout(type, speed);
        } else {
          setIsTyping(false);
          setIsComplete(true);
        }
      };
      
      type();
    };

    timeout = setTimeout(startTyping, delay);

    return () => clearTimeout(timeout);
  }, [text, speed, delay]);

  const reset = useCallback(() => {
    setDisplayText('');
    setIsComplete(false);
  }, []);

  return { displayText, isTyping, isComplete, reset };
};

// Hook for spring physics animation
export const useSpring = (targetValue, config = {}) => {
  const [currentValue, setCurrentValue] = useState(targetValue);
  const frameRef = useRef();
  
  const tension = config.tension || 300;
  const friction = config.friction || 30;
  
  useEffect(() => {
    let velocity = 0;
    let current = currentValue;
    
    const animate = () => {
      const displacement = targetValue - current;
      const springForce = displacement * tension / 1000;
      const dampingForce = velocity * friction / 100;
      
      velocity += springForce - dampingForce;
      current += velocity;
      
      if (Math.abs(displacement) < 0.01 && Math.abs(velocity) < 0.01) {
        setCurrentValue(targetValue);
        return;
      }
      
      setCurrentValue(current);
      frameRef.current = requestAnimationFrame(animate);
    };
    
    frameRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [targetValue, tension, friction]);
  
  return currentValue;
};

// Hook for scroll progress
export const useScrollProgress = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = docHeight > 0 ? scrollTop / docHeight : 0;
      setProgress(Math.min(Math.max(scrollPercent, 0), 1));
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return progress;
};

// Hook for tilt effect on mouse move
export const useTilt = (maxTilt = 15) => {
  const ref = useRef(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleMouseMove = (e) => {
      const rect = element.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const percentX = (e.clientX - centerX) / (rect.width / 2);
      const percentY = (e.clientY - centerY) / (rect.height / 2);
      
      setTilt({
        x: percentY * maxTilt,
        y: -percentX * maxTilt,
      });
    };

    const handleMouseLeave = () => {
      setTilt({ x: 0, y: 0 });
    };

    element.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      element.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [maxTilt]);

  const style = {
    transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
    transition: 'transform 0.1s ease-out',
  };

  return [ref, style, tilt];
};
