import { useEffect } from 'react'
import { PRODUCT } from '../product'

const fallback = {
  name: '[제품 이름]',
  concept: '[제품 컨셉, 한 줄]',
  description: '[제품 설명, 2~3문장]',
}

export function ProductHeader() {
  useEffect(() => {
    document.title = PRODUCT.name || fallback.name
  }, [])

  return (
    <header className="product-header">
      <p className={`t-display ${PRODUCT.name ? '' : 'placeholder'}`}>
        {PRODUCT.name || fallback.name}
      </p>
      <p className={`t-label ${PRODUCT.concept ? '' : 'placeholder'}`}>
        {PRODUCT.concept || fallback.concept}
      </p>
      <p className={`t-body product-description ${PRODUCT.description ? '' : 'placeholder'}`}>
        {PRODUCT.description || fallback.description}
      </p>
    </header>
  )
}
