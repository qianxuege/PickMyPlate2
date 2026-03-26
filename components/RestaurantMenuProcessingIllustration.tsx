import { SvgXml } from 'react-native-svg';

/**
 * Restaurant menu scan processing illustration (216×286).
 * Green theme aligned with restaurantRoleTheme; structure matches original orange asset.
 */
const MENU_PROCESSING_ILLUSTRATION_XML = `
<svg width="216" height="286" viewBox="0 0 216 286" fill="none" xmlns="http://www.w3.org/2000/svg">
<g opacity="0.500293">
<path d="M68 146C68 144.895 68.8954 144 70 144H126C127.105 144 128 144.895 128 146C128 147.105 127.105 148 126 148H70C68.8954 148 68 147.105 68 146Z" fill="#059669"/>
</g>
<g opacity="0.550828">
<path d="M68 154C68 152.895 68.8954 152 70 152H146C147.105 152 148 152.895 148 154C148 155.105 147.105 156 146 156H70C68.8954 156 68 155.105 68 154Z" fill="#34D399"/>
</g>
<g opacity="0.681649">
<path d="M68 162C68 160.895 68.8954 160 70 160H136C137.105 160 138 160.895 138 162C138 163.105 137.105 164 136 164H70C68.8954 164 68 163.105 68 162Z" fill="#A7F3D0"/>
</g>
<g filter="url(#rmproc_filter_dd)">
<mask id="rmproc_mask_inside" fill="white">
<path d="M12 196C12 187.163 19.1634 180 28 180H188C196.837 180 204 187.163 204 196V248C204 256.837 196.837 264 188 264H28C19.1634 264 12 256.837 12 248V196Z"/>
</mask>
<path d="M12 196C12 187.163 19.1634 180 28 180H188C196.837 180 204 187.163 204 196V248C204 256.837 196.837 264 188 264H28C19.1634 264 12 256.837 12 248V196Z" fill="white" shape-rendering="crispEdges"/>
<path d="M28 180V182H188V180V178H28V180ZM204 196H202V248H204H206V196H204ZM188 264V262H28V264V266H188V264ZM12 248H14V196H12H10V248H12ZM28 264V262C20.268 262 14 255.732 14 248H12H10C10 257.941 18.0589 266 28 266V264ZM204 248H202C202 255.732 195.732 262 188 262V264V266C197.941 266 206 257.941 206 248H204ZM188 180V182C195.732 182 202 188.268 202 196H204H206C206 186.059 197.941 178 188 178V180ZM28 180V178C18.0589 178 10 186.059 10 196H12H14C14 188.268 20.268 182 28 182V180Z" fill="#D1FAE5" mask="url(#rmproc_mask_inside)"/>
<g opacity="0.500293">
<path d="M30 202C30 199.791 31.7909 198 34 198C36.2091 198 38 199.791 38 202C38 204.209 36.2091 206 34 206C31.7909 206 30 204.209 30 202Z" fill="#059669"/>
</g>
<g opacity="0.500293">
<path d="M46 202C46 199.791 47.7909 198 50 198H182C184.209 198 186 199.791 186 202C186 204.209 184.209 206 182 206H50C47.7909 206 46 204.209 46 202Z" fill="#E5E7EB"/>
</g>
<g opacity="0.550828">
<path d="M30 222C30 219.791 31.7909 218 34 218C36.2091 218 38 219.791 38 222C38 224.209 36.2091 226 34 226C31.7909 226 30 224.209 30 222Z" fill="#059669"/>
</g>
<g opacity="0.550828">
<path d="M46 222C46 219.791 47.7909 218 50 218H182C184.209 218 186 219.791 186 222C186 224.209 184.209 226 182 226H50C47.7909 226 46 224.209 46 222Z" fill="#E5E7EB"/>
</g>
<g opacity="0.681649">
<path d="M30 242C30 239.791 31.7909 238 34 238C36.2091 238 38 239.791 38 242C38 244.209 36.2091 246 34 246C31.7909 246 30 244.209 30 242Z" fill="#059669"/>
</g>
<g opacity="0.681649">
<path d="M46 242C46 239.791 47.7909 238 50 238H182C184.209 238 186 239.791 186 242C186 244.209 184.209 246 182 246H50C47.7909 246 46 244.209 46 242Z" fill="#E5E7EB"/>
</g>
</g>
<g opacity="0.500293">
<path d="M12 24C12 10.7452 22.7452 0 36 0H116C129.255 0 140 10.7452 140 24V104C140 117.255 129.255 128 116 128H36C22.7452 128 12 117.255 12 104V24Z" fill="url(#rmproc_paint_linear)"/>
<path d="M82.6668 42.6666H69.3335L62.6668 50.6666H54.6668C53.2523 50.6666 51.8958 51.2285 50.8956 52.2287C49.8954 53.2289 49.3335 54.5855 49.3335 56V80C49.3335 81.4144 49.8954 82.771 50.8956 83.7712C51.8958 84.7714 53.2523 85.3333 54.6668 85.3333H97.3335C98.748 85.3333 100.105 84.7714 101.105 83.7712C102.105 82.771 102.667 81.4144 102.667 80V56C102.667 54.5855 102.105 53.2289 101.105 52.2287C100.105 51.2285 98.748 50.6666 97.3335 50.6666H89.3335L82.6668 42.6666Z" stroke="#059669" stroke-width="5.33333" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M76 74.6666C80.4183 74.6666 84 71.0849 84 66.6666C84 62.2483 80.4183 58.6666 76 58.6666C71.5817 58.6666 68 62.2483 68 66.6666C68 71.0849 71.5817 74.6666 76 74.6666Z" stroke="#059669" stroke-width="5.33333" stroke-linecap="round" stroke-linejoin="round"/>
</g>
<defs>
<filter id="rmproc_filter_dd" x="0" y="178" width="216" height="108" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feMorphology radius="4" operator="erode" in="SourceAlpha" result="effect1_dropShadow_46_1675"/>
<feOffset dy="4"/>
<feGaussianBlur stdDeviation="3"/>
<feComposite in2="hardAlpha" operator="out"/>
<feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0"/>
<feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_46_1675"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feMorphology radius="3" operator="erode" in="SourceAlpha" result="effect2_dropShadow_46_1675"/>
<feOffset dy="10"/>
<feGaussianBlur stdDeviation="7.5"/>
<feComposite in2="hardAlpha" operator="out"/>
<feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0"/>
<feBlend mode="normal" in2="effect1_dropShadow_46_1675" result="effect2_dropShadow_46_1675"/>
<feBlend mode="normal" in="SourceGraphic" in2="effect2_dropShadow_46_1675" result="shape"/>
</filter>
<linearGradient id="rmproc_paint_linear" x1="12" y1="0" x2="140" y2="128" gradientUnits="userSpaceOnUse">
<stop stop-color="#ECFDF5"/>
<stop offset="1" stop-color="#D1FAE5"/>
</linearGradient>
</defs>
</svg>
`.trim();

type Props = {
  width?: number;
  height?: number;
};

export function RestaurantMenuProcessingIllustration({ width = 216, height = 286 }: Props) {
  return <SvgXml xml={MENU_PROCESSING_ILLUSTRATION_XML} width={width} height={height} />;
}
