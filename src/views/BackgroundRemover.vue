<template>
  <main
    class="image-editor"
    tabindex="0"
    @paste="onPaste"
    @dragover.prevent
    @drop.prevent="onDrop"
  >
    <input
      ref="fileInput"
      class="visually-hidden"
      type="file"
      accept="image/png,image/jpeg,image/webp"
      @change="onFileChange"
    />
    <input
      ref="backgroundInput"
      class="visually-hidden"
      type="file"
      accept="image/png,image/jpeg,image/webp"
      @change="onBackgroundFileChange"
    />

    <header data-testid="editor-topbar" class="editor-topbar">
      <RouterLink
        class="editor-brand"
        to="/"
        aria-label="返回 Wristo Image 首页"
      >
        <span class="editor-brand-mark"><i /><i /></span
        ><span>Wristo <b>Image</b></span>
      </RouterLink>
      <span class="topbar-divider" />
      <button class="topbar-upload" type="button" @click="fileInput?.click()">
        <span>＋</span>{{ sourceImage ? "更换图片" : "上传图片" }}
      </button>
      <span v-if="fileName" class="topbar-filename">{{ fileName }}</span>
      <div class="history-actions" aria-label="历史操作">
        <button type="button" :disabled="!canUndo" title="撤销" @click="undo">
          ↶</button
        ><button type="button" :disabled="!canRedo" title="重做" @click="redo">
          ↷
        </button>
      </div>
      <span class="topbar-local"><i /> {{ activeTool.id === 'ai-watermark-remover' ? 'AI 安全处理' : '本地处理' }}</span>
      <button
        data-testid="save-canvas-button"
        class="topbar-save"
        type="button"
        :disabled="!sourceImage || isSavingCanvas"
        @click="saveCurrentCanvas"
      >
        {{ isSavingCanvas ? "保存中…" : "保存" }}
      </button>
      <button
        data-testid="download-button"
        class="topbar-download"
        type="button"
        :disabled="!sourceImage"
        @click="openExport"
      >
        导出 <span>↓</span>
      </button>
    </header>

    <div
      class="editor-body"
      :style="{ '--history-panel-width': `${historyPanelWidth}px` }"
    >
      <nav data-testid="tool-rail" class="tool-rail" aria-label="编辑工具">
        <button
          v-for="tool in editorTools"
          :key="tool.id"
          type="button"
          class="rail-item"
          :class="{ active: activeTool.id === tool.id }"
          :data-tool-id="tool.id"
          :disabled="!sourceImage"
          :title="!sourceImage ? '请先上传图片' : tool.description"
          @click="selectTool(tool.id)"
        >
          <span class="rail-icon">{{ tool.icon }}</span
          ><b>{{ tool.title }}</b>
        </button>
        <button class="rail-item" type="button" @click="fileInput?.click()">
          <span class="rail-icon">↥</span><b>上传</b>
        </button>
        <button class="rail-item" type="button" :disabled="!sourceImage" @click="openExport">
          <span class="rail-icon">↓</span><b>导出</b>
        </button>
        <div class="rail-spacer" />
        <span class="privacy-dot" :title="activeTool.id === 'ai-watermark-remover' ? '仅使用 AI 工具时上传' : '图片不会上传服务器'" />
      </nav>

      <aside data-testid="tool-panel" class="tool-panel">
        <div class="tool-panel-heading">
          <div>
            <span>{{ activeCategoryDefinition.title }}工具</span>
            <h1>{{ activeTool.title }}</h1>
          </div>
          <span class="active-badge">已启用</span>
        </div>
        <p class="panel-intro">{{ activeTool.description }}</p>

        <div data-testid="category-tool-list" class="category-tool-list">
          <button
            v-for="tool in categoryTools"
            :key="tool.id"
            type="button"
            :class="{ active: activeTool.id === tool.id }"
            :data-tool-id="tool.id"
            :disabled="!sourceImage"
            :title="!sourceImage ? '请先上传图片' : tool.description"
            @click="selectTool(tool.id)"
          >
            <span>{{ tool.icon }}</span>
            <span class="tool-copy"><b>{{ tool.title }}</b><small>{{ !sourceImage ? '请先上传图片' : tool.description }}</small></span>
            <i>›</i>
          </button>
        </div>

        <button
          v-if="!sourceImage"
          class="panel-upload-card"
          type="button"
          @click="fileInput?.click()"
        >
          <span>＋</span><strong>上传一张图片</strong
          ><small>PNG · JPEG · WEBP</small>
        </button>
        <div v-else class="source-card">
          <div class="source-thumb">IMG</div>
          <div>
            <strong>{{ fileName }}</strong
            ><small
              >{{ sourceImage.width }} × {{ sourceImage.height }} px</small
            >
          </div>
          <button type="button" @click="fileInput?.click()">更换</button>
        </div>

        <section
          v-if="activeTool.id === 'ai-watermark-remover'"
          class="panel-section operation-panel watermark-panel"
        >
          <div class="section-title"><span>AI 修复</span></div>
          <button
            data-testid="watermark-auto-button"
            class="primary-operation"
            type="button"
            :disabled="watermarkBusy || !sourceImage"
            @click="runAutomaticWatermarkRemoval"
          >{{ watermarkBusy ? watermarkProgressLabel : '自动识别并去除' }}</button>
          <div class="watermark-mask-modes">
            <button type="button" :class="{ active: watermarkMaskMode === 'rectangle' }" @click="watermarkMaskMode = 'rectangle'">矩形框选</button>
            <button data-testid="watermark-mask-mode-add" type="button" :class="{ active: watermarkMaskMode === 'add' }" @click="watermarkMaskMode = 'add'">画笔增加</button>
            <button data-testid="watermark-mask-mode-erase" type="button" :class="{ active: watermarkMaskMode === 'erase' }" @click="watermarkMaskMode = 'erase'">橡皮减少</button>
          </div>
          <label>画笔大小
            <input v-model.number="watermarkBrushSize" type="range" min="4" max="160" />
            <output>{{ watermarkBrushSize }} px</output>
          </label>
          <p>自动处理后若仍有残留，可框选或涂抹水印区域；橙色覆盖层表示将由 AI 重建的范围。</p>
          <button
            data-testid="watermark-mask-submit"
            class="primary-operation"
            type="button"
            :disabled="watermarkBusy || !watermarkMaskHasPixels"
            @click="runMaskedWatermarkRemoval"
          >按调整范围重新修复</button>
          <small class="watermark-upload-notice">仅处理你拥有或已获授权的图片。图片会上传至 Wristo 服务端并由阿里云百炼处理。</small>
        </section>

        <section
          v-if="activeTool.id === 'background-remover'"
          class="panel-section output-settings"
        >
          <div class="section-title"><span>输出设置</span></div>
          <label>
            输出比例
            <select data-testid="cutout-ratio" v-model.number="outputAspectRatio">
              <option :value="null">自由</option>
              <option :value="1">1:1</option>
              <option :value="4 / 3">4:3</option>
              <option :value="3 / 4">3:4</option>
              <option :value="16 / 9">16:9</option>
              <option :value="9 / 16">9:16</option>
            </select>
          </label>
          <label class="checkbox-setting">
            <input data-testid="trim-whitespace" v-model="trimWhitespace" type="checkbox" />
            去掉透明空白
          </label>
          <p>保持图标原比例，居中补透明区域。</p>
        </section>

        <section
          v-if="activeTool.id === 'background-remover'"
          class="panel-section"
        >
          <div class="section-title">
            <span>背景容差</span><output>{{ tolerance }}</output>
          </div>
          <input
            data-testid="tolerance-input"
            class="tolerance-slider"
            type="range"
            min="0"
            max="120"
            step="1"
            v-model.number="tolerance"
            :disabled="!selection"
            @input="processSelection"
          />
          <div class="range-label">
            <span>保留边缘</span><span>清除更多</span>
          </div>
        </section>

        <section
          v-if="activeTool.id === 'background-fill'"
          class="panel-section operation-panel"
        >
          <div class="background-fill-modes">
            <button
              data-testid="background-fill-mode-color"
              type="button"
              :class="{ active: backgroundFillMode === 'color' }"
              @click="backgroundFillMode = 'color'"
            >纯色填充</button>
            <button
              data-testid="background-fill-mode-content"
              type="button"
              :class="{ active: backgroundFillMode === 'content' }"
              @click="backgroundFillMode = 'content'"
            >内容填充</button>
          </div>
          <label v-if="backgroundFillMode === 'color'"
            >填充颜色
            <input
              data-testid="background-fill-color"
              v-model="backgroundFillColor"
              type="color"
            />
          </label>
          <p v-if="backgroundFillMode === 'color'">每次框选后立即填色，可连续框选；修改颜色会用于下一次框选。</p>
          <p v-else>根据选区四周的背景自动补齐，并平滑过渡边缘；选区应完整覆盖要移除的内容。</p>
        </section>

        <section
          v-if="activeTool.id === 'background-remover'"
          class="panel-section instructions"
        >
          <div class="section-title"><span>操作步骤</span></div>
          <ol>
            <li><span>1</span>上传图片</li>
            <li><span>2</span>在画布上框住图标</li>
            <li><span>3</span>调整容差并下载</li>
          </ol>
        </section>

        <section
          v-if="activeTool.id === 'crop'"
          class="panel-section operation-panel"
        >
          <div class="section-title"><span>裁剪比例</span></div>
          <div class="ratio-grid">
            <button
              v-for="ratio in cropRatios"
              :key="ratio.label"
              type="button"
              :data-crop-ratio="ratio.value ?? 'free'"
              :aria-pressed="selectedCropRatio === ratio.value"
              :class="{ active: selectedCropRatio === ratio.value }"
              @click="setCropRatio(ratio.value)"
            >
              {{ ratio.label }}
            </button>
          </div>
          <p>
            {{
              selection
                ? `${Math.round(Math.abs(selection.width))} × ${Math.round(Math.abs(selection.height))} px`
                : "在画布上拖动创建裁剪框"
            }}
          </p>
          <button
            class="primary-operation"
            type="button"
            :disabled="!selection"
            @click="applyCrop"
          >
            应用裁剪
          </button>
        </section>

        <section
          v-if="activeTool.id === 'resize'"
          class="panel-section operation-panel"
        >
          <div class="section-title"><span>常用尺寸</span></div>
          <div class="resize-presets">
            <button type="button" data-resize-preset="1440x720" @click="setResizeSize(1440, 720)">
              Banner <strong>1440 × 720</strong>
            </button>
          </div>
          <label
            >宽度
            <input
              v-model.number="resizeWidth"
              type="number"
              min="1"
              max="8192"
            />
            px</label
          >
          <label
            >高度
            <input
              v-model.number="resizeHeight"
              type="number"
              min="1"
              max="8192"
            />
            px</label
          >
          <label>模式
            <select v-model="resizeMode" data-testid="resize-mode" @change="persistResizeMode">
              <option value="cover">裁切铺满</option>
              <option value="contain">完整适应</option>
              <option value="stretch">拉伸填满</option>
            </select>
          </label>
          <p>{{ resizeModeDescription }}</p>
          <button
            class="primary-operation"
            type="button"
            :disabled="!sourceImage"
            @click="applyResize"
          >
            应用尺寸
          </button>
        </section>

        <section
          v-if="activeTool.id === 'rotate-flip'"
          class="panel-section operation-panel"
        >
          <label class="rotation-angle-control">
            旋转角度
            <input
              v-model.number="rotationAngle"
              data-testid="rotation-angle"
              type="number"
              min="-360"
              max="360"
              step="0.1"
              :disabled="!sourceImage"
              @input="updateRotationPreview"
            />
            <span>°</span>
          </label>
          <p>正数顺时针，负数逆时针；画布会自动扩大以保留完整图片。</p>
          <div class="operation-grid">
            <button type="button" @click="applyRotate('counter-clockwise')">
              ↶<small>左转</small></button
            ><button type="button" @click="applyRotate('clockwise')">
              ↷<small>右转</small></button
            ><button type="button" @click="applyFlip('horizontal')">
              ↔<small>水平翻转</small></button
            ><button type="button" @click="applyFlip('vertical')">
              ↕<small>垂直翻转</small>
            </button>
          </div>
        </section>

        <div
          v-if="previewImage && ['background-remover', 'background-fill'].includes(activeTool.id)"
          class="result-card"
        >
          <span>{{ activeTool.id === 'background-fill' ? '背景填色预览已生成' : '透明结果已生成' }}</span
          ><strong
            >{{ renderedPreview?.width }} × {{ renderedPreview?.height }} px</strong
          >
        </div>
        <section
          v-if="previewImage && ['smart-erase', 'restore', 'background', 'outline'].includes(activeTool.id)"
          class="cutout-studio"
        >
          <div v-if="isBrushTool(activeTool.id)" class="effect-panel">
            <label
              >画笔大小
              <input
                v-model.number="brushSize"
                type="range"
                min="4"
                max="120"
              />
              <output>{{ brushSize }} px</output></label
            >
            <label
              >画笔硬度
              <input
                v-model.number="brushHardness"
                type="range"
                min="0"
                max="100"
              />
              <output>{{ brushHardness }}%</output></label
            >
            <p v-if="activeTool.id === 'smart-erase'">智能擦除会在松开画笔后用周围背景补齐；应用后才会写入画布。</p>
            <p v-else>恢复会从原图重新显露对应区域；应用后才会写入画布。</p>
          </div>

          <div v-else-if="activeTool.id === 'background'" class="effect-panel">
            <div class="background-types">
              <button
                v-for="item in backgroundTypes"
                :key="item.id"
                type="button"
                :class="{ active: backgroundType === item.id }"
                @click="backgroundType = item.id"
              >
                {{ item.label }}
              </button>
            </div>
            <label v-if="backgroundType === 'color'"
              >背景颜色 <input v-model="backgroundColor" type="color"
            /></label>
            <template v-if="backgroundType === 'gradient'"
              ><label
                >起始颜色 <input v-model="gradientFrom" type="color" /></label
              ><label
                >结束颜色 <input v-model="gradientTo" type="color" /></label
            ></template>
            <template v-if="backgroundType === 'image'"
              ><button
                class="upload-background"
                type="button"
                @click="backgroundInput?.click()"
              >
                {{ backgroundImage ? "更换背景图片" : "上传背景图片" }}</button
              ><label
                >铺放方式
                <select v-model="backgroundFit">
                  <option value="cover">填充</option>
                  <option value="contain">适应</option>
                  <option value="stretch">拉伸</option>
                </select></label
              ></template
            >
          </div>

          <div v-else class="effect-panel">
            <label
              >描边宽度
              <input
                v-model.number="outlineWidth"
                type="range"
                min="0"
                max="32"
              />
              <output>{{ outlineWidth }} px</output></label
            >
            <label
              >描边颜色 <input v-model="outlineColor" type="color"
            /></label>
            <p>描边位于主体下方，不会修改透明主体。</p>
          </div>
        </section>
        <div
          v-if="previewImage"
          class="tool-preview-actions"
          data-testid="tool-preview-actions"
        >
          <button type="button" class="preview-cancel" @click="cancelToolPreview()">取消</button>
          <button type="button" class="primary-operation" @click="applyToolPreview">
            {{ activeTool.id === 'rotate-flip' ? '应用旋转' : '应用到画布' }}
          </button>
        </div>
        <p v-if="errorMessage" role="alert" class="editor-error">
          {{ errorMessage }}
        </p>
        <p v-if="toolNotice" role="status" class="tool-notice">{{ toolNotice }}</p>
        <button
          v-if="previewImage && ['background-remover', 'background-fill'].includes(activeTool.id)"
          class="reselect-button"
          type="button"
          @click="reselect"
        >
          重新框选
        </button>
        <button
          data-testid="reset-button"
          class="panel-reset"
          type="button"
          :disabled="!sourceImage"
          @click="resetWorkspace"
        >
          重置参数
        </button>
        <div v-if="activeTool.id !== 'ai-watermark-remover'" class="local-note">
          <i />
          <span
            ><strong>图片仅在当前浏览器中处理</strong
            ><br />不会上传服务器，历史仅保存在本机浏览器。</span
          >
        </div>
        <div v-else class="local-note ai-note"><i /><span><strong>AI 处理会临时上传图片</strong><br />处理完成后不在 Wristo 数据库或磁盘长期保存。</span></div>
      </aside>

      <section class="editor-workspace">
        <div class="workspace-toolbar">
          <span>{{ workspaceMessage }}</span>
          <span v-if="sourceImage" class="zoom-chip"
            >{{ Math.round(viewScale * 100) }}%</span
          >
        </div>
        <div
          ref="workspaceStage"
          class="workspace-stage"
          :class="{ checkerboard: previewImage, panning: isPanning }"
          @wheel.prevent="onWheel"
          @pointerdown.capture="onStagePointerDown"
          @pointermove.capture="onStagePointerMove"
          @pointerup.capture="onStagePointerUp"
          @pointercancel.capture="onStagePointerCancel"
        >
          <canvas
            ref="editorCanvas"
            :style="editorCanvasStyle"
            @pointerdown="startSelection"
            @pointermove="moveSelection"
            @pointerup="finishSelection"
            @pointercancel="finishSelection"
            @pointerleave="clearCropCursor"
          />
          <canvas
            ref="previewCanvas"
            class="result-canvas"
            :class="{ refining: isBrushTool(activeTool.id) }"
            :style="previewCanvasStyle"
            @pointerdown="startRefine"
            @pointermove="moveRefine"
            @pointerup="finishRefine"
            @pointercancel="finishRefine"
            @pointerenter="updateBrushCursor"
            @pointerleave="hideBrushCursor"
          />
          <span
            v-if="brushCursor"
            data-testid="brush-cursor"
            class="brush-cursor"
            :style="{
              left: `${brushCursor.left}px`,
              top: `${brushCursor.top}px`,
              width: `${brushCursor.diameter}px`,
              height: `${brushCursor.diameter}px`,
            }"
          />
          <button
            v-if="!sourceImage"
            class="workspace-empty"
            type="button"
            @click="fileInput?.click()"
          >
            <span class="empty-image-icon"><i>＋</i></span>
            <strong>上传图片开始编辑</strong>
            <small>点击上传、拖入或直接粘贴图片</small>
            <b>上传图片</b>
          </button>
          <div
            data-testid="canvas-zoom-controls"
            class="canvas-zoom-controls"
            aria-label="画布缩放"
          >
            <button
              type="button"
              title="缩小"
              :disabled="!sourceImage"
              @click="changeZoom(-0.1)"
            >
              −
            </button>
            <button
              type="button"
              class="zoom-value"
              title="恢复 100%"
              :disabled="!sourceImage"
              @click="resetZoom"
            >
              {{ Math.round(viewScale * 100) }}%
            </button>
            <button
              type="button"
              title="放大"
              :disabled="!sourceImage"
              @click="changeZoom(0.1)"
            >
              ＋
            </button>
            <button
              type="button"
              class="fit-button"
              title="适应画布"
              :disabled="!sourceImage"
              @click="fitView"
            >
              适应
            </button>
          </div>
        </div>
        <footer class="workspace-footer">
          <span>最大 25 MB · 8192 × 8192 px</span
          ><span>滚轮缩放 · 长按或中键拖动画布</span>
        </footer>
      </section>
      <div class="history-panel-shell">
        <button
          data-testid="history-panel-resize-handle"
          class="history-panel-resize-handle"
          type="button"
          aria-label="调整历史图片区宽度"
          title="拖动调整历史图片区宽度"
          @pointerdown="startHistoryPanelResize"
        />
        <ImageHistoryPanel
          :images="localHistoryImages"
          :downloading="isDownloadingHistoryZip"
          @select="loadHistoryImage"
          @download="downloadHistoryImage"
          @download-selected="downloadSelectedHistory"
          @delete="deleteHistoryImage"
          @clear="clearImageHistory"
        />
      </div>
    </div>

    <AppModal
      :open="exportOpen"
      title="保存图片"
      eyebrow="导出设置"
      width="420px"
      @close="exportOpen = false"
    >
      <div class="export-form">
        <label
          >格式
          <select v-model="exportFormat">
            <option value="png">PNG</option>
            <option value="jpeg">JPEG</option>
            <option value="webp">WebP</option>
          </select></label
        >
        <label v-if="exportFormat !== 'png'"
          >质量
          <input
            v-model.number="exportQuality"
            type="range"
            min="10"
            max="100"
          />
          {{ exportQuality }}%</label
        >
        <div class="export-size">
          <label
            >宽度
            <input
              v-model.number="exportWidth"
              type="number"
              min="1"
              max="8192" /></label
          ><span>×</span
          ><label
            >高度
            <input
              v-model.number="exportHeight"
              type="number"
              min="1"
              max="8192"
          /></label>
        </div>
        <p>
          {{
            exportFormat === "jpeg"
              ? "JPEG 不支持透明通道，透明区域将使用白色填充。"
              : "透明通道将被保留。"
          }}
        </p>
        <button class="export-confirm" @click="downloadExport">
          下载 {{ exportFormat.toUpperCase() }}
        </button>
      </div>
    </AppModal>
  </main>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import {
  editorCategories,
  editorTools,
  getCategoryTools,
  resolveEditorTool,
  type EditorCategoryId,
  type EditorToolDefinition,
} from "@/features/editor/toolRegistry";
import { ImageHistory } from "@/features/editor/imageHistory";
import { CanvasToolSession } from "@/features/editor/canvasToolSession";
import {
  createLocalImageHistoryRepository,
  type LocalImageHistoryEntry,
} from "@/features/editor/localImageHistory";
import {
  hasTransparentPixels,
  resolveCurrentImageExportSettings,
  type ImageExportFormat,
} from "@/features/editor/exportSettings";
import {
  cropImage,
  fitImageToSize,
  flipImage,
  resizeImage,
  rotateImage,
  rotateImageByAngle,
  type ImageFitMode,
} from "@/features/editor/imageOperations";
import {
  loadResizeMode,
  saveResizeMode,
} from "@/features/editor/resizePreferences";
import { consumeWheelZoom } from "@/features/editor/zoomControl";
import { resolveBrushCursor } from "@/features/editor/brushCursor";
import {
  createCropRect,
  cropHandlePoints,
  hitTestCropRect,
  moveCropRect,
  resizeCropRect,
  type CropHandle,
} from "@/features/editor/cropGeometry";
import { downloadBlob } from "@/features/editor/downloadBlob";
import {
  createHistoryZip,
  historyZipFileName,
} from "@/features/editor/downloadHistoryZip";
import {
  HISTORY_PANEL_WIDTH_STORAGE_KEY,
  loadHistoryPanelWidth,
  normalizeHistoryPanelWidth,
} from "@/features/editor/historyPanelWidth";
import {
  createCanvasHistoryName,
  encodePixelImageAsPng,
} from "@/features/editor/canvasHistorySave";
import {
  applyContentAwareErase,
  applyContentAwareFill,
  applyRefineBrush,
  renderCutout,
  type CutoutBackground,
  type RefineBrushMode,
} from "@/features/background-remover/cutoutEffects";
import {
  validateImageDimensions,
  validateImageFile,
} from "@/features/background-remover/fileValidation";
import {
  loadCutoutPreferences,
  saveCutoutPreferences,
} from "@/features/background-remover/cutoutPreferences";
import {
  applyCutoutOutputOptions,
  fillSelectionWithColor,
  normalizeSelection,
  removeConnectedBackground,
  trimTransparentBounds,
  type PixelImage,
  type SelectionRect,
} from "@/features/background-remover/imageProcessor";
import ImageHistoryPanel, {
  type ImageHistoryPanelItem,
} from "@/components/editor/ImageHistoryPanel.vue";
import AppModal from "@/components/ui/AppModal.vue";
import {
  createWatermarkRemovalTask,
  waitForWatermarkRemoval,
} from "@/features/watermark-remover/watermarkRemovalApi";
import {
  applyMaskBrush,
  applyMaskRectangle,
  createWatermarkMask,
  maskToRgba,
  type WatermarkMask,
} from "@/features/watermark-remover/watermarkMask";

const savedCutoutPreferences = loadCutoutPreferences(window.localStorage);
const localImageHistoryRepository = createLocalImageHistoryRepository();
const fileInput = ref<HTMLInputElement | null>(null);
const backgroundInput = ref<HTMLInputElement | null>(null);
const editorCanvas = ref<HTMLCanvasElement | null>(null);
const previewCanvas = ref<HTMLCanvasElement | null>(null);
const workspaceStage = ref<HTMLDivElement | null>(null);
const sourceImage = ref<PixelImage | null>(null);
const previewImage = ref<PixelImage | null>(null);
const toolSession = ref<CanvasToolSession | null>(null);
const selection = ref<SelectionRect | null>(null);
const selectionStart = ref<{ x: number; y: number } | null>(null);
const selectedCropRatio = ref<number | null>(null);
const cropGesture = ref<{
  handle: CropHandle;
  pointer: { x: number; y: number };
  rect: SelectionRect;
} | null>(null);
const fileName = ref("");
const sourceMimeType = ref("");
const errorMessage = ref("");
const toolNotice = ref("");
const watermarkBusy = ref(false);
const watermarkProgressLabel = ref("正在上传…");
const watermarkMaskMode = ref<"rectangle" | "add" | "erase">("rectangle");
const watermarkBrushSize = ref(36);
const watermarkMask = ref<WatermarkMask | null>(null);
const watermarkOriginalImage = ref<PixelImage | null>(null);
const watermarkMaskHasPixels = computed(() => watermarkMask.value?.data.some(value => value > 0) ?? false);
const watermarkPainting = ref(false);
const tolerance = ref(savedCutoutPreferences.tolerance);
const outputAspectRatio = ref<number | null>(savedCutoutPreferences.aspectRatio);
const trimWhitespace = ref(savedCutoutPreferences.trimWhitespace);
const activeTool = ref(resolveEditorTool("background-remover"));
const activeCategory = ref<EditorCategoryId>("cutout");
const history = ref<ImageHistory | null>(null);
const historyRevision = ref(0);
const viewScale = ref(1);
const wheelRemainder = ref(0);
const panX = ref(0);
const panY = ref(0);
const isPanning = ref(false);
const panStart = ref<{
  x: number;
  y: number;
  panX: number;
  panY: number;
} | null>(null);
const LONG_PRESS_PAN_DELAY_MS = 300;
const LONG_PRESS_MOVE_THRESHOLD_PX = 5;
let longPressPanTimer: ReturnType<typeof setTimeout> | null = null;
let pendingLongPress: {
  x: number;
  y: number;
  pointerId: number;
  startsToolGesture: boolean;
} | null = null;
const resizeWidth = ref(1);
const resizeHeight = ref(1);
const resizeMode = ref<ImageFitMode>(loadResizeMode(window.localStorage));
const resizeModeDescription = computed(() => ({
  cover: "等比缩放并从中心裁切，铺满目标尺寸。",
  contain: "完整保留图片，空余区域使用透明像素补齐。",
  stretch: "直接填满目标尺寸，图片比例可能改变。",
})[resizeMode.value]);
const rotationAngle = ref<number | string>(0);
const exportOpen = ref(false);
const exportFormat = ref<ImageExportFormat>("png");
const exportQuality = ref(90);
const exportWidth = ref(1);
const exportHeight = ref(1);
const isSavingCanvas = ref(false);
const isDownloadingHistoryZip = ref(false);
const localHistoryEntries = ref<LocalImageHistoryEntry[]>([]);
const localHistoryImages = ref<ImageHistoryPanelItem[]>([]);
const historyPanelWidth = ref(loadHistoryPanelWidth(window.localStorage));
let historyPanelResizeStart: { clientX: number; width: number } | null = null;

const moveHistoryPanelResize = (event: PointerEvent): void => {
  if (!historyPanelResizeStart) return;
  historyPanelWidth.value = normalizeHistoryPanelWidth(
    historyPanelResizeStart.width + historyPanelResizeStart.clientX - event.clientX,
  );
};
const finishHistoryPanelResize = (): void => {
  if (!historyPanelResizeStart) return;
  historyPanelResizeStart = null;
  window.localStorage.setItem(HISTORY_PANEL_WIDTH_STORAGE_KEY, String(historyPanelWidth.value));
  window.removeEventListener("pointermove", moveHistoryPanelResize);
  window.removeEventListener("pointerup", finishHistoryPanelResize);
  window.removeEventListener("pointercancel", finishHistoryPanelResize);
};
const startHistoryPanelResize = (event: PointerEvent): void => {
  event.preventDefault();
  historyPanelResizeStart = { clientX: event.clientX, width: historyPanelWidth.value };
  window.addEventListener("pointermove", moveHistoryPanelResize);
  window.addEventListener("pointerup", finishHistoryPanelResize);
  window.addEventListener("pointercancel", finishHistoryPanelResize);
};
const isBrushTool = (toolId: EditorToolDefinition["id"]): boolean =>
  toolId === "smart-erase" || toolId === "restore";
const brushMode = computed<RefineBrushMode>(() =>
  activeTool.value.id === "restore" ? "restore" : "erase",
);
const brushSize = ref(32);
const brushHardness = ref(85);
const isRefining = ref(false);
const refineStrokePoints = ref<Array<{ x: number; y: number }>>([]);
const brushPointer = ref<{ clientX: number; clientY: number } | null>(null);
const backgroundType = ref<"transparent" | "color" | "gradient" | "image">(
  "transparent",
);
const backgroundTypes = [
  { id: "transparent" as const, label: "透明" },
  { id: "color" as const, label: "纯色" },
  { id: "gradient" as const, label: "渐变" },
  { id: "image" as const, label: "图片" },
];
const backgroundColor = ref("#ffffff");
const backgroundFillColor = ref("#ffffff");
const backgroundFillMode = ref<"color" | "content">("color");
const gradientFrom = ref("#ff8124");
const gradientTo = ref("#191d24");
const backgroundImage = ref<PixelImage | null>(null);
const backgroundFit = ref<"cover" | "contain" | "stretch">("cover");
const outlineWidth = ref(0);
const outlineColor = ref("#ffffff");
const cropRatios = [
  { label: "自由", value: null },
  { label: "1:1", value: 1 },
  { label: "4:3", value: 4 / 3 },
  { label: "16:9", value: 16 / 9 },
];
const canUndo = computed(() => {
  historyRevision.value;
  if (previewImage.value && isBrushTool(activeTool.value.id))
    return toolSession.value?.canUndo ?? false;
  return !previewImage.value && (history.value?.canUndo ?? false);
});
const canRedo = computed(() => {
  historyRevision.value;
  if (previewImage.value && isBrushTool(activeTool.value.id))
    return toolSession.value?.canRedo ?? false;
  return !previewImage.value && (history.value?.canRedo ?? false);
});
const activeCategoryDefinition = computed(() => editorCategories.find(category => category.id === activeCategory.value) ?? editorCategories[0]!);
const categoryTools = computed(() => getCategoryTools(activeCategory.value));
const canvasTransform = computed(() => ({
  transform: `translate(${panX.value}px, ${panY.value}px) scale(${viewScale.value})`,
}));
const editorCanvasStyle = computed(() => ({
  ...canvasTransform.value,
  display: sourceImage.value && !previewImage.value ? "" : "none",
}));
const previewCanvasStyle = computed(() => ({
  ...canvasTransform.value,
  display: previewImage.value ? "" : "none",
}));
const brushCursor = computed(() => {
  viewScale.value;
  const pointer = brushPointer.value;
  const canvas = previewCanvas.value;
  const stage = workspaceStage.value;
  if (!pointer || !canvas || !stage || !isBrushTool(activeTool.value.id)) return null;
  return resolveBrushCursor({
    ...pointer,
    brushSize: brushSize.value,
    canvasWidth: canvas.width,
    canvasBounds: canvas.getBoundingClientRect(),
    stageBounds: stage.getBoundingClientRect(),
  });
});
const workspaceMessage = computed(() =>
  previewImage.value
    ? `${activeTool.value.title}预览（尚未应用）`
    : !sourceImage.value
      ? "画布"
      : activeTool.value.id === "crop"
        ? "拖动鼠标创建裁剪区域"
        : activeTool.value.id === "background-fill"
          ? backgroundFillMode.value === "content"
            ? "拖动鼠标框选要移除并自动补齐的区域"
            : "拖动鼠标框选要填色的背景区域"
        : activeTool.value.id === "ai-watermark-remover"
          ? watermarkMaskMode.value === "rectangle"
            ? "框选仍需修复的水印区域"
            : watermarkMaskMode.value === "add"
              ? "涂抹增加 AI 修复范围"
              : "涂抹减少 AI 修复范围"
        : activeTool.value.id === "background-remover"
          ? "拖动鼠标框选要保留的图标"
          : "图片预览",
);
const cutoutBackground = computed<CutoutBackground>(() => {
  if (backgroundType.value === "color")
    return { type: "color", color: backgroundColor.value };
  if (backgroundType.value === "gradient")
    return { type: "gradient", from: gradientFrom.value, to: gradientTo.value };
  if (backgroundType.value === "image" && backgroundImage.value)
    return {
      type: "image",
      image: backgroundImage.value,
      fit: backgroundFit.value,
    };
  return { type: "transparent" };
});
const renderedPreview = computed(() => {
  if (!previewImage.value) return null;
  const subject = activeTool.value.id === "background-remover"
    ? applyCutoutOutputOptions(previewImage.value, {
        aspectRatio: outputAspectRatio.value,
        trimWhitespace: trimWhitespace.value,
      })
    : previewImage.value;
  return renderCutout(subject, {
    background: activeTool.value.id === "background" ? cutoutBackground.value : { type: "transparent" },
    outline: activeTool.value.id === "outline"
      ? { width: outlineWidth.value, color: outlineColor.value }
      : { width: 0, color: outlineColor.value },
  });
});

watch([outputAspectRatio, trimWhitespace, tolerance], () => {
  saveCutoutPreferences(window.localStorage, {
    aspectRatio: outputAspectRatio.value,
    trimWhitespace: trimWhitespace.value,
    tolerance: tolerance.value,
  });
  if (activeTool.value.id === "background-remover" && previewImage.value) void showPreview();
});

const pixelImageFromBitmap = (bitmap: ImageBitmap): PixelImage => {
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("当前浏览器无法创建图片画布。");
  context.drawImage(bitmap, 0, 0);
  const imageData = context.getImageData(0, 0, bitmap.width, bitmap.height);
  return {
    width: imageData.width,
    height: imageData.height,
    data: imageData.data,
  };
};

const drawPixelImage = (canvas: HTMLCanvasElement, image: PixelImage): void => {
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext("2d");
  if (!context) return;
  context.putImageData(
    new ImageData(new Uint8ClampedArray(image.data), image.width, image.height),
    0,
    0,
  );
};

const drawEditor = (): void => {
  const canvas = editorCanvas.value;
  const image = sourceImage.value;
  if (!canvas || !image) return;
  drawPixelImage(canvas, image);
  if (activeTool.value.id === "ai-watermark-remover" && watermarkMask.value) {
    const overlay = document.createElement("canvas");
    overlay.width = watermarkMask.value.width;
    overlay.height = watermarkMask.value.height;
    const overlayContext = overlay.getContext("2d");
    if (overlayContext) {
      const rgba = new Uint8ClampedArray(watermarkMask.value.width * watermarkMask.value.height * 4);
      watermarkMask.value.data.forEach((value, index) => {
        if (!value) return;
        const offset = index * 4;
        rgba[offset] = 255;
        rgba[offset + 1] = 104;
        rgba[offset + 2] = 24;
        rgba[offset + 3] = 105;
      });
      overlayContext.putImageData(new ImageData(rgba, overlay.width, overlay.height), 0, 0);
      canvas.getContext("2d")?.drawImage(overlay, 0, 0);
    }
  }
  const current =
    selection.value &&
    normalizeSelection(selection.value, image.width, image.height);
  if (!current) return;
  const context = canvas.getContext("2d");
  if (!context) return;
  context.save();
  context.fillStyle = "rgba(3, 7, 12, .58)";
  context.beginPath();
  context.rect(0, 0, image.width, image.height);
  context.rect(current.x, current.y, current.width, current.height);
  context.fill("evenodd");
  context.strokeStyle = "#ff9f43";
  context.lineWidth = Math.max(2, image.width / 500);
  context.setLineDash([10, 8]);
  context.strokeRect(current.x, current.y, current.width, current.height);
  if (activeTool.value.id === "crop") {
    const renderedWidth = canvas.getBoundingClientRect().width;
    const radius = renderedWidth ? (6 * canvas.width) / renderedWidth : Math.max(3, image.width / 160);
    context.setLineDash([]);
    context.fillStyle = "#ffffff";
    context.strokeStyle = "#ff8124";
    context.lineWidth = Math.max(1.5, radius / 3);
    Object.values(cropHandlePoints(current)).forEach((point) => {
      context.beginPath();
      context.arc(point.x, point.y, radius, 0, Math.PI * 2);
      context.fill();
      context.stroke();
    });
  }
  context.restore();
};

const revokeHistoryPreviewUrls = (): void => {
  localHistoryImages.value.forEach((image) => URL.revokeObjectURL(image.previewUrl));
};

const refreshLocalImageHistory = async (): Promise<void> => {
  if (!localImageHistoryRepository) return;
  const entries = await localImageHistoryRepository.list();
  revokeHistoryPreviewUrls();
  localHistoryEntries.value = entries;
  localHistoryImages.value = entries.map((entry) => ({
    id: entry.id,
    name: entry.name,
    width: entry.width,
    height: entry.height,
    createdAt: entry.createdAt,
    previewUrl: URL.createObjectURL(entry.blob),
  }));
};

onMounted(() => {
  void refreshLocalImageHistory().catch((error) => {
    console.warn("无法读取本地图片历史：", error);
  });
});

onBeforeUnmount(() => {
  revokeHistoryPreviewUrls();
  if (longPressPanTimer) clearTimeout(longPressPanTimer);
  finishHistoryPanelResize();
});

const showPreview = async (): Promise<void> => {
  await nextTick();
  if (previewCanvas.value && renderedPreview.value)
    drawPixelImage(previewCanvas.value, renderedPreview.value);
};

watch(
  [
    backgroundType,
    backgroundColor,
    gradientFrom,
    gradientTo,
    backgroundImage,
    backgroundFit,
    outlineWidth,
    outlineColor,
  ],
  () => {
    if (previewImage.value) void showPreview();
  },
);

const loadFile = async (file: File): Promise<void> => {
  errorMessage.value = validateImageFile(file) ?? "";
  if (errorMessage.value) return;
  try {
    const bitmap = await createImageBitmap(file);
    errorMessage.value =
      validateImageDimensions(bitmap.width, bitmap.height) ?? "";
    if (errorMessage.value) {
      bitmap.close();
      return;
    }
    sourceImage.value = pixelImageFromBitmap(bitmap);
    history.value = new ImageHistory(sourceImage.value);
    historyRevision.value += 1;
    bitmap.close();
    fileName.value = file.name;
    sourceMimeType.value = file.type;
    selection.value = null;
    previewImage.value = null;
    toolSession.value = null;
    resizeWidth.value = sourceImage.value.width;
    resizeHeight.value = sourceImage.value.height;
    exportWidth.value = sourceImage.value.width;
    exportHeight.value = sourceImage.value.height;
    if (localImageHistoryRepository) {
      try {
        const createdAt = Date.now();
        await localImageHistoryRepository.save({
          id: `${createdAt}-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`,
          name: file.name,
          mimeType: file.type,
          width: sourceImage.value.width,
          height: sourceImage.value.height,
          createdAt,
          blob: file,
        });
        await refreshLocalImageHistory();
      } catch (error) {
        console.warn("无法保存本地图片历史：", error);
      }
    }
    await nextTick();
    drawEditor();
  } catch {
    errorMessage.value = "无法读取这张图片，请尝试重新导出后再上传。";
  }
};

const onFileChange = (event: Event): void => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (file) void loadFile(file);
};
const onBackgroundFileChange = async (event: Event): Promise<void> => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file || validateImageFile(file)) return;
  try {
    const bitmap = await createImageBitmap(file);
    backgroundImage.value = pixelImageFromBitmap(bitmap);
    bitmap.close();
    backgroundType.value = "image";
  } catch {
    errorMessage.value = "无法读取背景图片。";
  }
};
const onDrop = (event: DragEvent): void => {
  const file = event.dataTransfer?.files[0];
  if (file) void loadFile(file);
};
const onPaste = (event: ClipboardEvent): void => {
  const file = [...(event.clipboardData?.files ?? [])][0];
  if (file) void loadFile(file);
};

const loadHistoryImage = async (id: string): Promise<void> => {
  const entry = localHistoryEntries.value.find((image) => image.id === id);
  if (!entry) return;
  try {
    const bitmap = await createImageBitmap(entry.blob);
    sourceImage.value = pixelImageFromBitmap(bitmap);
    bitmap.close();
    history.value = new ImageHistory(sourceImage.value);
    historyRevision.value += 1;
    fileName.value = entry.name;
    sourceMimeType.value = entry.mimeType;
    selection.value = null;
    previewImage.value = null;
    toolSession.value = null;
    resizeWidth.value = entry.width;
    resizeHeight.value = entry.height;
    exportWidth.value = entry.width;
    exportHeight.value = entry.height;
    errorMessage.value = "";
    await nextTick();
    drawEditor();
  } catch {
    errorMessage.value = "无法读取这张历史图片，可能已被浏览器清理。";
  }
};

const downloadHistoryImage = (id: string): void => {
  const entry = localHistoryEntries.value.find((image) => image.id === id);
  if (!entry) return;
  downloadBlob(entry.blob, entry.name);
};

const downloadSelectedHistory = async (ids: string[]): Promise<void> => {
  if (isDownloadingHistoryZip.value) return;
  const selectedIds = new Set(ids);
  const entries = localHistoryEntries.value.filter(entry => selectedIds.has(entry.id));
  if (!entries.length) return;

  isDownloadingHistoryZip.value = true;
  errorMessage.value = "";
  try {
    const archive = await createHistoryZip(entries.map(entry => ({
      name: entry.name,
      blob: entry.blob,
    })));
    downloadBlob(archive, historyZipFileName());
  } catch (error) {
    console.warn("无法打包历史图片：", error);
    errorMessage.value = "历史图片打包失败，请稍后重试。";
  } finally {
    isDownloadingHistoryZip.value = false;
  }
};

const deleteHistoryImage = async (id: string): Promise<void> => {
  if (!localImageHistoryRepository) return;
  await localImageHistoryRepository.delete(id);
  await refreshLocalImageHistory();
};

const clearImageHistory = async (): Promise<void> => {
  if (!localImageHistoryRepository) return;
  await localImageHistoryRepository.clear();
  await refreshLocalImageHistory();
};

const saveCurrentCanvas = async (): Promise<void> => {
  const current = sourceImage.value;
  if (!current || !localImageHistoryRepository || isSavingCanvas.value) return;
  isSavingCanvas.value = true;
  errorMessage.value = "";
  try {
    const savedAt = new Date();
    const createdAt = savedAt.getTime();
    const name = createCanvasHistoryName(fileName.value, savedAt);
    const blob = await encodePixelImageAsPng(current);
    await localImageHistoryRepository.save({
      id: `${createdAt}-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`,
      name,
      mimeType: "image/png",
      width: current.width,
      height: current.height,
      createdAt,
      blob,
    });
    await refreshLocalImageHistory();
    toolNotice.value = "当前画布已保存到历史记录";
  } catch {
    errorMessage.value = "无法保存当前画布，请检查浏览器存储空间后重试。";
  } finally {
    isSavingCanvas.value = false;
  }
};

const pointInImage = (event: PointerEvent): { x: number; y: number } | null => {
  const canvas = editorCanvas.value;
  if (!canvas) return null;
  const bounds = canvas.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return null;
  return {
    x: Math.max(
      0,
      Math.min(
        canvas.width,
        ((event.clientX - bounds.left) * canvas.width) / bounds.width,
      ),
    ),
    y: Math.max(
      0,
      Math.min(
        canvas.height,
        ((event.clientY - bounds.top) * canvas.height) / bounds.height,
      ),
    ),
  };
};

const cropCursors: Record<CropHandle, string> = {
  nw: "nwse-resize", n: "ns-resize", ne: "nesw-resize", e: "ew-resize",
  se: "nwse-resize", s: "ns-resize", sw: "nesw-resize", w: "ew-resize", move: "move",
};
const clearCropCursor = (): void => {
  if (editorCanvas.value && !cropGesture.value) editorCanvas.value.style.cursor = "";
};
const updateCropCursor = (event: PointerEvent): void => {
  if (activeTool.value.id !== "crop" || !selection.value || cropGesture.value) return;
  const point = pointInImage(event);
  const canvas = editorCanvas.value;
  if (!point || !canvas) return;
  const renderedWidth = canvas.getBoundingClientRect().width;
  const radius = renderedWidth ? (12 * canvas.width) / renderedWidth : 12;
  const handle = hitTestCropRect(point, selection.value, radius);
  canvas.style.cursor = handle ? cropCursors[handle] : "crosshair";
};

const startSelection = (event: PointerEvent): void => {
  if (event.button !== 0) return;
  if (activeTool.value.id === "ai-watermark-remover" && watermarkMaskMode.value !== "rectangle") {
    const point = pointInImage(event);
    if (!point || !watermarkMask.value) return;
    watermarkPainting.value = true;
    applyMaskBrush(watermarkMask.value, point, watermarkBrushSize.value, watermarkMaskMode.value === "add");
    editorCanvas.value?.setPointerCapture(event.pointerId);
    drawEditor();
    return;
  }
  if (
    !["background-remover", "background-fill", "crop", "ai-watermark-remover"].includes(activeTool.value.id) ||
    previewImage.value
  )
    return;
  const point = pointInImage(event);
  if (!point) return;
  if (activeTool.value.id === "crop" && selection.value) {
    const canvas = editorCanvas.value;
    const renderedWidth = canvas?.getBoundingClientRect().width ?? 0;
    const hitRadius = renderedWidth && canvas ? (12 * canvas.width) / renderedWidth : 12;
    const handle = hitTestCropRect(point, selection.value, hitRadius);
    if (handle) {
      cropGesture.value = { handle, pointer: point, rect: { ...selection.value } };
      editorCanvas.value?.setPointerCapture?.(event.pointerId);
      return;
    }
  }
  selectionStart.value = point;
  selection.value = { ...point, width: 0, height: 0 };
  editorCanvas.value?.setPointerCapture(event.pointerId);
};
const moveSelection = (event: PointerEvent): void => {
  if (watermarkPainting.value && watermarkMask.value) {
    const point = pointInImage(event);
    if (!point) return;
    applyMaskBrush(watermarkMask.value, point, watermarkBrushSize.value, watermarkMaskMode.value === "add");
    drawEditor();
    return;
  }
  if (cropGesture.value && sourceImage.value) {
    const point = pointInImage(event);
    if (!point) return;
    const gesture = cropGesture.value;
    selection.value = gesture.handle === "move"
      ? moveCropRect(gesture.rect, {
          x: gesture.rect.x + point.x - gesture.pointer.x,
          y: gesture.rect.y + point.y - gesture.pointer.y,
        }, sourceImage.value)
      : resizeCropRect(
          gesture.rect,
          gesture.handle,
          point,
          sourceImage.value,
          selectedCropRatio.value,
        );
    drawEditor();
    return;
  }
  updateCropCursor(event);
  if (!selectionStart.value) return;
  const point = pointInImage(event);
  if (!point) return;
  selection.value = activeTool.value.id === "crop"
    ? createCropRect(selectionStart.value, point, sourceImage.value!, selectedCropRatio.value)
    : {
        x: selectionStart.value.x,
        y: selectionStart.value.y,
        width: point.x - selectionStart.value.x,
        height: point.y - selectionStart.value.y,
      };
  drawEditor();
};
const finishSelection = (event: PointerEvent): void => {
  if (watermarkPainting.value) {
    moveSelection(event);
    watermarkPainting.value = false;
    return;
  }
  if (cropGesture.value) {
    moveSelection(event);
    cropGesture.value = null;
    drawEditor();
    return;
  }
  if (!selectionStart.value || !sourceImage.value) return;
  moveSelection(event);
  selectionStart.value = null;
  const normalized =
    selection.value &&
    normalizeSelection(
      selection.value,
      sourceImage.value.width,
      sourceImage.value.height,
    );
  if (!normalized || normalized.width < 3 || normalized.height < 3) {
    selection.value = null;
    previewImage.value = null;
    errorMessage.value = "选区太小，请重新框选图标。";
    drawEditor();
    return;
  }
  selection.value = normalized;
  if (activeTool.value.id === "ai-watermark-remover" && watermarkMask.value) {
    applyMaskRectangle(watermarkMask.value, normalized, true);
    selection.value = null;
  }
  if (activeTool.value.id === "background-remover") processSelection();
  if (activeTool.value.id === "background-fill") applyBackgroundFill();
  drawEditor();
};

const processSelection = (): void => {
  if (!sourceImage.value || !selection.value) return;
  const processed = removeConnectedBackground(
    sourceImage.value,
    selection.value,
    tolerance.value,
  );
  const normalized = normalizeSelection(
    selection.value,
    sourceImage.value.width,
    sourceImage.value.height,
  );
  const hasSubject = trimTransparentBounds(processed) !== null;
  toolSession.value = hasSubject && normalized
    ? new CanvasToolSession(cropImage(sourceImage.value, normalized))
    : null;
  previewImage.value = hasSubject ? toolSession.value?.preview(processed) ?? null : null;
  errorMessage.value = previewImage.value
    ? ""
    : "没有识别到可保留的主体，请降低容差或重新框选。";
  void showPreview();
};

const applyBackgroundFill = (): void => {
  if (!sourceImage.value || !selection.value) return;
  const filled = backgroundFillMode.value === "content"
    ? applyContentAwareFill(sourceImage.value, selection.value)
    : fillSelectionWithColor(
        sourceImage.value,
        selection.value,
        backgroundFillColor.value,
      );
  commitImage(filled);
  errorMessage.value = "";
};

const pointInPreviewSubject = (
  event: PointerEvent,
): { x: number; y: number } | null => {
  const canvas = previewCanvas.value;
  const image = previewImage.value;
  if (!canvas || !image) return null;
  const bounds = canvas.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return null;
  const renderedX =
    ((event.clientX - bounds.left) * canvas.width) / bounds.width;
  const renderedY =
    ((event.clientY - bounds.top) * canvas.height) / bounds.height;
  return {
    x: renderedX,
    y: renderedY,
  };
};
const refineAt = (event: PointerEvent): void => {
  if (!previewImage.value || !toolSession.value) return;
  const point = pointInPreviewSubject(event);
  if (!point) return;
  refineStrokePoints.value.push(point);
  if (brushMode.value === "erase") {
    return;
  }
  previewImage.value = toolSession.value.preview(applyRefineBrush(
    previewImage.value,
    toolSession.value.original,
    {
      ...point,
      size: brushSize.value,
      hardness: brushHardness.value,
      mode: brushMode.value,
    },
  ));
  void showPreview();
};
const updateBrushCursor = (event: PointerEvent): void => {
  if (!isBrushTool(activeTool.value.id)) return;
  brushPointer.value = { clientX: event.clientX, clientY: event.clientY };
};
const hideBrushCursor = (): void => {
  if (!isRefining.value) brushPointer.value = null;
};
const startRefine = (event: PointerEvent): void => {
  if (event.button !== 0 || !isBrushTool(activeTool.value.id)) return;
  isRefining.value = true;
  refineStrokePoints.value = [];
  previewCanvas.value?.setPointerCapture(event.pointerId);
  refineAt(event);
};
const moveRefine = (event: PointerEvent): void => {
  updateBrushCursor(event);
  if (isRefining.value) refineAt(event);
};
const finishRefine = (): void => {
  if (!isRefining.value || !previewImage.value) return;
  isRefining.value = false;
  if (brushMode.value === "erase" && refineStrokePoints.value.length && toolSession.value) {
    previewImage.value = toolSession.value.commitStep(applyContentAwareErase(previewImage.value, {
      points: refineStrokePoints.value,
      size: brushSize.value,
      hardness: brushHardness.value,
    }));
  } else if (brushMode.value === "restore" && refineStrokePoints.value.length && toolSession.value) {
    previewImage.value = toolSession.value.commitStep(previewImage.value);
  }
  refineStrokePoints.value = [];
  historyRevision.value += 1;
  void showPreview();
};

const cancelToolPreview = (showNotice = false): void => {
  if (previewImage.value && showNotice) toolNotice.value = "未应用的修改已取消";
  toolSession.value?.cancel();
  brushPointer.value = null;
  refineStrokePoints.value = [];
  toolSession.value = null;
  previewImage.value = null;
  selection.value = null;
  if (activeTool.value.id === "rotate-flip") rotationAngle.value = 0;
  void nextTick(drawEditor);
};

const applyToolPreview = (): void => {
  const result = renderedPreview.value;
  if (!result) return;
  toolSession.value?.preview(result);
  commitImage(toolSession.value?.apply() ?? result);
  toolSession.value = null;
  if (activeTool.value.id === "rotate-flip") rotationAngle.value = 0;
  toolNotice.value = "修改已应用到当前画布";
};

const encodeWatermarkMask = (mask: WatermarkMask): Promise<Blob> => {
  const canvas = document.createElement("canvas");
  canvas.width = mask.width;
  canvas.height = mask.height;
  const context = canvas.getContext("2d");
  if (!context) return Promise.reject(new Error("当前浏览器无法创建蒙版画布。"));
  context.putImageData(new ImageData(new Uint8ClampedArray(maskToRgba(mask)), mask.width, mask.height), 0, 0);
  return new Promise((resolve, reject) => canvas.toBlob(
    blob => blob ? resolve(blob) : reject(new Error("无法生成水印蒙版。")),
    "image/png",
  ));
};

const applyWatermarkResult = async (resultUrl: string): Promise<void> => {
  const response = await fetch(resultUrl, { cache: "no-store" });
  if (!response.ok) throw new Error("AI 修复结果暂时无法下载");
  const bitmap = await createImageBitmap(await response.blob());
  const result = pixelImageFromBitmap(bitmap);
  bitmap.close();
  commitImage(result);
  watermarkMask.value = createWatermarkMask(result.width, result.height);
  toolNotice.value = "AI 去水印结果已应用，可撤销或继续调整范围";
};

const runWatermarkRemoval = async (mode: "automatic" | "mask"): Promise<void> => {
  const original = mode === "automatic" ? sourceImage.value : watermarkOriginalImage.value;
  if (!original || (mode === "mask" && !watermarkMask.value)) return;
  watermarkBusy.value = true;
  errorMessage.value = "";
  watermarkProgressLabel.value = "正在上传…";
  try {
    if (mode === "automatic") {
      watermarkOriginalImage.value = original;
      watermarkMask.value = createWatermarkMask(original.width, original.height);
    }
    const image = await encodePixelImageAsPng(original);
    const mask = mode === "mask" ? await encodeWatermarkMask(watermarkMask.value!) : undefined;
    const task = await createWatermarkRemovalTask({ image, mask, mode });
    watermarkProgressLabel.value = "AI 正在识别与修复…";
    const status = await waitForWatermarkRemoval(task.taskToken);
    if (!status.resultUrl) throw new Error("AI 去水印任务未返回结果");
    watermarkProgressLabel.value = "正在获取结果…";
    await applyWatermarkResult(status.resultUrl);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "AI 去水印处理失败";
  } finally {
    watermarkBusy.value = false;
  }
};

const runAutomaticWatermarkRemoval = (): void => { void runWatermarkRemoval("automatic"); };
const runMaskedWatermarkRemoval = (): void => { void runWatermarkRemoval("mask"); };

const resetWorkspace = (): void => {
  tolerance.value = 28;
  outputAspectRatio.value = null;
  trimWhitespace.value = false;
  selection.value = null;
  selectedCropRatio.value = null;
  watermarkMask.value = sourceImage.value
    ? createWatermarkMask(sourceImage.value.width, sourceImage.value.height)
    : null;
  watermarkOriginalImage.value = sourceImage.value;
  cropGesture.value = null;
  cancelToolPreview();
  errorMessage.value = "";
  drawEditor();
};

const reselect = (): void => {
  cancelToolPreview();
  errorMessage.value = "";
};

const selectTool = (toolId: EditorToolDefinition["id"]): void => {
  const tool = resolveEditorTool(toolId);
  if (!sourceImage.value) return;
  cancelToolPreview(true);
  activeTool.value = tool;
  activeCategory.value = tool.categoryId;
  if (tool.id === "ai-watermark-remover" && sourceImage.value) {
    watermarkOriginalImage.value = sourceImage.value;
    watermarkMask.value = createWatermarkMask(sourceImage.value.width, sourceImage.value.height);
    watermarkMaskMode.value = "rectangle";
  }
  if (["smart-erase", "restore", "background", "outline"].includes(tool.id)) {
    toolSession.value = new CanvasToolSession(sourceImage.value);
    previewImage.value = toolSession.value.rendered;
  }
  selection.value = null;
  errorMessage.value = "";
  if (previewImage.value) void showPreview();
  else void nextTick(drawEditor);
};

const commitImage = (image: PixelImage): void => {
  sourceImage.value = history.value?.commit(image) ?? image;
  if (!history.value) history.value = new ImageHistory(image);
  historyRevision.value += 1;
  selection.value = null;
  previewImage.value = null;
  toolSession.value = null;
  resizeWidth.value = image.width;
  resizeHeight.value = image.height;
  exportWidth.value = image.width;
  exportHeight.value = image.height;
  void nextTick(drawEditor);
};

const restoreHistory = (image: PixelImage): void => {
  sourceImage.value = image;
  selection.value = null;
  previewImage.value = null;
  toolSession.value = null;
  resizeWidth.value = image.width;
  resizeHeight.value = image.height;
  exportWidth.value = image.width;
  exportHeight.value = image.height;
  historyRevision.value += 1;
  void nextTick(drawEditor);
};
const undo = (): void => {
  if (previewImage.value && isBrushTool(activeTool.value.id) && toolSession.value?.canUndo) {
    previewImage.value = toolSession.value.undo();
    historyRevision.value += 1;
    void showPreview();
    return;
  }
  if (history.value?.canUndo) restoreHistory(history.value.undo());
};
const redo = (): void => {
  if (previewImage.value && isBrushTool(activeTool.value.id) && toolSession.value?.canRedo) {
    previewImage.value = toolSession.value.redo();
    historyRevision.value += 1;
    void showPreview();
    return;
  }
  if (history.value?.canRedo) restoreHistory(history.value.redo());
};
const applyRotate = (direction: "clockwise" | "counter-clockwise"): void => {
  if (sourceImage.value) {
    rotationAngle.value = 0;
    commitImage(rotateImage(sourceImage.value, direction));
  }
};
const updateRotationPreview = (): void => {
  if (!sourceImage.value) return;
  if (rotationAngle.value === "") {
    toolSession.value = null;
    previewImage.value = null;
    void nextTick(drawEditor);
    return;
  }
  const angle = Math.max(-360, Math.min(360, Number(rotationAngle.value) || 0));
  rotationAngle.value = angle;
  if (angle === 0) {
    toolSession.value = null;
    previewImage.value = null;
    void nextTick(drawEditor);
    return;
  }
  toolSession.value = new CanvasToolSession(sourceImage.value);
  previewImage.value = toolSession.value.preview(rotateImageByAngle(sourceImage.value, angle));
  void showPreview();
};
const applyFlip = (direction: "horizontal" | "vertical"): void => {
  if (sourceImage.value) {
    rotationAngle.value = 0;
    commitImage(flipImage(sourceImage.value, direction));
  }
};
const applyCrop = (): void => {
  if (sourceImage.value && selection.value)
    commitImage(cropImage(sourceImage.value, selection.value));
};
const setCropRatio = (ratio: number | null): void => {
  if (!sourceImage.value) return;
  selectedCropRatio.value = ratio;
  if (!ratio) {
    drawEditor();
    return;
  }
  const centerX = selection.value
    ? selection.value.x + selection.value.width / 2
    : sourceImage.value.width / 2;
  const centerY = selection.value
    ? selection.value.y + selection.value.height / 2
    : sourceImage.value.height / 2;
  let width = selection.value?.width ?? sourceImage.value.width * 0.8;
  let height = width / ratio;
  const maxWidth = 2 * Math.min(centerX, sourceImage.value.width - centerX);
  const maxHeight = 2 * Math.min(centerY, sourceImage.value.height - centerY);
  if (height > maxHeight) {
    height = maxHeight;
    width = height * ratio;
  }
  if (width > maxWidth) {
    width = maxWidth;
    height = width / ratio;
  }
  selection.value = {
    x: centerX - width / 2,
    y: centerY - height / 2,
    width,
    height,
  };
  drawEditor();
};
const setResizeSize = (width: number, height: number): void => {
  resizeWidth.value = width;
  resizeHeight.value = height;
};
const persistResizeMode = (): void => {
  saveResizeMode(window.localStorage, resizeMode.value);
};
const applyResize = (): void => {
  if (sourceImage.value)
    commitImage(
      fitImageToSize(sourceImage.value, resizeWidth.value, resizeHeight.value, resizeMode.value),
    );
};
const changeZoom = (delta: number): void => {
  viewScale.value = Math.max(
    0.1,
    Math.min(8, Math.round((viewScale.value + delta) * 10) / 10),
  );
};
const resetZoom = (): void => {
  viewScale.value = 1;
  panX.value = 0;
  panY.value = 0;
};
const fitView = (): void => {
  viewScale.value = 1;
  panX.value = 0;
  panY.value = 0;
};
const onWheel = (event: WheelEvent): void => {
  if (!sourceImage.value) return;
  const result = consumeWheelZoom(wheelRemainder.value, event.deltaY);
  wheelRemainder.value = result.remainder;
  if (result.steps) changeZoom(result.steps * 0.1);
};
const startPan = (event: PointerEvent): void => {
  if (event.button !== 1 || !sourceImage.value) return;
  event.preventDefault();
  isPanning.value = true;
  panStart.value = {
    x: event.clientX,
    y: event.clientY,
    panX: panX.value,
    panY: panY.value,
  };
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
};
const movePan = (event: PointerEvent): void => {
  if (!panStart.value) return;
  panX.value = panStart.value.panX + event.clientX - panStart.value.x;
  panY.value = panStart.value.panY + event.clientY - panStart.value.y;
};
const endPan = (): void => {
  isPanning.value = false;
  panStart.value = null;
};

const clearPendingLongPress = (): void => {
  if (longPressPanTimer) clearTimeout(longPressPanTimer);
  longPressPanTimer = null;
  pendingLongPress = null;
};

const beginToolGesture = (start: NonNullable<typeof pendingLongPress>): void => {
  if (!start.startsToolGesture) return;
  const event = {
    button: 0,
    clientX: start.x,
    clientY: start.y,
    pointerId: start.pointerId,
  } as PointerEvent;
  if (previewImage.value) startRefine(event);
  else startSelection(event);
};

const onStagePointerDown = (event: PointerEvent): void => {
  if (event.button === 1) {
    startPan(event);
    return;
  }
  if (event.button !== 0 || !sourceImage.value) return;
  if ((event.target as HTMLElement).closest(".canvas-zoom-controls")) return;

  event.stopPropagation();
  clearPendingLongPress();
  pendingLongPress = {
    x: event.clientX,
    y: event.clientY,
    pointerId: event.pointerId,
    startsToolGesture:
      event.target === editorCanvas.value || event.target === previewCanvas.value,
  };
  longPressPanTimer = setTimeout(() => {
    const start = pendingLongPress;
    if (!start) return;
    pendingLongPress = null;
    longPressPanTimer = null;
    isRefining.value = false;
    refineStrokePoints.value = [];
    selectionStart.value = null;
    cropGesture.value = null;
    isPanning.value = true;
    panStart.value = {
      x: start.x,
      y: start.y,
      panX: panX.value,
      panY: panY.value,
    };
    workspaceStage.value?.setPointerCapture(start.pointerId);
  }, LONG_PRESS_PAN_DELAY_MS);
};

const onStagePointerMove = (event: PointerEvent): void => {
  const pending = pendingLongPress;
  if (pending) {
    const distance = Math.hypot(event.clientX - pending.x, event.clientY - pending.y);
    if (distance > LONG_PRESS_MOVE_THRESHOLD_PX) {
      clearPendingLongPress();
      beginToolGesture(pending);
    }
  }
  movePan(event);
};

const onStagePointerUp = (): void => {
  const pending = pendingLongPress;
  if (pending) {
    clearPendingLongPress();
    beginToolGesture(pending);
  }
  endPan();
};

const onStagePointerCancel = (): void => {
  clearPendingLongPress();
  isRefining.value = false;
  refineStrokePoints.value = [];
  selectionStart.value = null;
  cropGesture.value = null;
  endPan();
};

const openExport = (): void => {
  const current = sourceImage.value;
  if (!current) return;
  const settings = resolveCurrentImageExportSettings({
    width: current.width,
    height: current.height,
    mimeType: sourceMimeType.value,
    fileName: fileName.value,
    hasTransparentResult: hasTransparentPixels(current.data),
  });
  exportFormat.value = settings.format;
  exportWidth.value = settings.width;
  exportHeight.value = settings.height;
  exportOpen.value = true;
};

const downloadExport = (): void => {
  const current = sourceImage.value;
  if (!current) return;
  const output =
    current.width === exportWidth.value && current.height === exportHeight.value
      ? current
      : resizeImage(current, exportWidth.value, exportHeight.value);
  const canvas = document.createElement("canvas");
  canvas.width = output.width;
  canvas.height = output.height;
  const context = canvas.getContext("2d");
  if (!context) return;
  if (exportFormat.value === "jpeg") {
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
  const pixels = document.createElement("canvas");
  drawPixelImage(pixels, output);
  context.drawImage(pixels, 0, 0);
  const mime = `image/${exportFormat.value}`;
  canvas.toBlob(
    (blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${fileName.value.replace(/\.[^.]+$/, "") || "wristo-image"}-edited.${exportFormat.value === "jpeg" ? "jpg" : exportFormat.value}`;
      link.click();
      URL.revokeObjectURL(url);
      exportOpen.value = false;
    },
    mime,
    exportQuality.value / 100,
  );
};
</script>

<style scoped>
.image-editor {
  height: 100vh;
  min-height: 620px;
  background: #f3f4f6;
  color: #20242a;
  display: grid;
  grid-template-rows: 58px 1fr;
  overflow: hidden;
  font-family: "Instrument Sans Variable", sans-serif;
  outline: none;
}
.editor-topbar {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 18px;
  background: #fff;
  border-bottom: 1px solid #e1e4e8;
  z-index: 5;
}
.editor-brand {
  display: flex;
  align-items: center;
  gap: 9px;
  font-family: "Bricolage Grotesque Variable";
  font-size: 18px;
  letter-spacing: -0.04em;
  color: #171a1f;
}
.editor-brand b {
  color: #ff8124;
}
.editor-brand-mark {
  width: 24px;
  height: 24px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3px;
  transform: rotate(7deg);
}
.editor-brand-mark i {
  border: 2px solid #ff8124;
}
.editor-brand-mark i:last-child {
  background: #ff8124;
  transform: translateY(4px);
}
.topbar-divider {
  width: 1px;
  height: 28px;
  background: #e1e4e8;
}
.topbar-upload {
  border: 0;
  background: #f1f3f5;
  color: #24282e;
  padding: 9px 15px;
  border-radius: 8px;
  font-weight: 650;
  cursor: pointer;
}
.topbar-upload span {
  font-size: 18px;
  margin-right: 6px;
}
.topbar-filename {
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #757d87;
  font-size: 12px;
}
.history-actions {
  display: flex;
  gap: 4px;
  margin-left: 4px;
}
.history-actions button {
  border: 0;
  background: transparent;
  font-size: 20px;
  color: #c1c6cc;
}
.topbar-local {
  margin-left: auto;
  color: #76808a;
  font-size: 11px;
}
.topbar-local i,
.local-note i {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #3fcb83;
  margin-right: 5px;
}
.topbar-download {
  border: 0;
  border-radius: 8px;
  background: #ff8124;
  color: white;
  padding: 10px 16px;
  font-weight: 750;
  cursor: pointer;
}
.topbar-save {
  border: 1px solid #d9dde2;
  border-radius: 8px;
  background: #fff;
  color: #4d5660;
  padding: 9px 14px;
  font-weight: 700;
  cursor: pointer;
}
.topbar-save:hover:not(:disabled) {
  border-color: #ff9d59;
  color: #dd6816;
}
.topbar-save:disabled {
  color: #aeb4bb;
  background: #f2f3f4;
  cursor: not-allowed;
}
.topbar-download:disabled {
  background: #c8ccd1;
  color: #f4f5f6;
  cursor: not-allowed;
}
.topbar-download span {
  margin-left: 15px;
}
.editor-body {
  min-height: 0;
  display: grid;
  grid-template-columns: 76px 304px minmax(0, 1fr) var(--history-panel-width);
}
.history-panel-shell {
  position: relative;
  min-width: 0;
  min-height: 0;
}
.history-panel-shell .image-history-panel {
  height: 100%;
  box-sizing: border-box;
}
.history-panel-resize-handle {
  position: absolute;
  z-index: 5;
  top: 0;
  bottom: 0;
  left: -4px;
  width: 8px;
  border: 0;
  padding: 0;
  background: transparent;
  cursor: col-resize;
  touch-action: none;
}
.history-panel-resize-handle::after {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  left: 3px;
  width: 2px;
  background: transparent;
  transition: background 0.15s ease;
}
.history-panel-resize-handle:hover::after,
.history-panel-resize-handle:focus-visible::after {
  background: #ff9d59;
}
.tool-rail {
  background: #fff;
  border-right: 1px solid #e1e4e8;
  display: flex;
  flex-direction: column;
  padding: 10px 6px;
  overflow-y: auto;
}
.rail-item {
  border: 0;
  background: transparent;
  color: #727b85;
  border-radius: 9px;
  min-height: 58px;
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  cursor: pointer;
}
.rail-item.active {
  background: #fff0e6;
  color: #e8640c;
}
.rail-item:disabled {
  color: #c4c9ce;
  cursor: not-allowed;
}
.rail-icon {
  font-size: 21px;
}
.rail-item b {
  font-size: 11px;
  font-weight: 600;
  line-height: 1.15;
  text-align: center;
}
.rail-spacer {
  flex: 1;
}
.privacy-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #3fcb83;
  align-self: center;
  margin-bottom: 12px;
  box-shadow: 0 0 0 5px #e8f8ef;
}
.tool-panel {
  background: #fff;
  border-right: 1px solid #dfe3e7;
  padding: 22px 18px;
  overflow: auto;
  box-shadow: 5px 0 18px rgba(31, 40, 49, 0.04);
  z-index: 2;
}
.tool-panel-heading {
  display: flex;
  justify-content: space-between;
  align-items: start;
}
.tool-panel-heading span {
  color: #929aa3;
  font-size: 11px;
}
.tool-panel-heading h1 {
  font: 650 25px "Bricolage Grotesque Variable";
  margin: 4px 0 0;
  color: #1f2328;
}
.active-badge {
  background: #eaf8f0 !important;
  color: #218d59 !important;
  padding: 5px 8px;
  border-radius: 999px;
}
.panel-intro {
  color: #747d86;
  font-size: 12px;
  line-height: 1.6;
  margin: 15px 0 20px;
}
.panel-upload-card {
  width: 100%;
  height: 126px;
  border: 1px dashed #c8cdd3;
  background: #fafbfc;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  color: #2d3339;
  cursor: pointer;
}
.panel-upload-card > span {
  font-size: 25px;
  color: #ff8124;
}
.panel-upload-card small {
  color: #9ba2aa;
  font-size: 9px;
}
.source-card {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) auto;
  gap: 9px;
  align-items: center;
  border: 1px solid #e2e5e9;
  border-radius: 9px;
  padding: 9px;
}
.source-thumb {
  height: 42px;
  background: #20262c;
  color: #ff9b54;
  display: grid;
  place-items: center;
  font-size: 9px;
}
.source-card strong,
.source-card small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.source-card strong {
  font-size: 11px;
}
.source-card small {
  font-size: 9px;
  color: #949ba3;
  margin-top: 4px;
}
.source-card button {
  border: 0;
  background: transparent;
  color: #e8640c;
  font-size: 10px;
  cursor: pointer;
}
.panel-section {
  border-top: 1px solid #eceef0;
  margin-top: 20px;
  padding-top: 18px;
}
.section-title {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 650;
}
.section-title output {
  color: #e8640c;
}
.tolerance-slider {
  width: 100%;
  accent-color: #ff8124;
  margin: 15px 0 5px;
}
.tolerance-slider:disabled {
  opacity: 0.4;
}
.range-label {
  display: flex;
  justify-content: space-between;
  color: #a0a6ad;
  font-size: 9px;
}
.instructions ol {
  padding: 0;
  margin: 12px 0;
  list-style: none;
}
.instructions li {
  display: flex;
  align-items: center;
  gap: 9px;
  color: #68717a;
  font-size: 11px;
  margin: 9px 0;
}
.instructions li span {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #f1f3f5;
  display: grid;
  place-items: center;
  color: #8a929a;
  font-size: 9px;
}
.result-card {
  margin-top: 17px;
  background: #f0f9f4;
  border: 1px solid #cfebda;
  padding: 11px;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  color: #31855a;
  font-size: 10px;
}
.editor-error {
  background: #fff0ed;
  color: #bc4938;
  padding: 9px;
  border-radius: 7px;
  font-size: 10px;
  line-height: 1.4;
}
.tool-notice {
  margin: 9px 0 0;
  color: #64707a;
  font-size: 10px;
}
.tool-preview-actions {
  display: grid;
  grid-template-columns: 1fr 1.35fr;
  gap: 8px;
  margin-top: 12px;
}
.preview-cancel {
  border: 1px solid #dfe3e7;
  border-radius: 7px;
  background: #fff;
  color: #606a73;
  cursor: pointer;
}
.reselect-button,
.panel-reset {
  width: 100%;
  padding: 10px;
  border-radius: 7px;
  margin-top: 9px;
  cursor: pointer;
}
.reselect-button {
  border: 0;
  background: #252a30;
  color: #fff;
}
.panel-reset {
  border: 1px solid #e0e3e6;
  background: #fff;
  color: #68717a;
}
.panel-reset:disabled {
  opacity: 0.4;
}
.local-note {
  display: flex;
  gap: 7px;
  border-top: 1px solid #eceef0;
  margin-top: 20px;
  padding-top: 15px;
  color: #9299a1;
  font-size: 9px;
  line-height: 1.55;
}
.local-note strong {
  color: #68717a;
}
.editor-workspace {
  min-width: 0;
  display: grid;
  grid-template-rows: 42px minmax(0, 1fr) 30px;
  background: #e8eaed;
}
.workspace-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 17px;
  background: #f8f9fa;
  border-bottom: 1px solid #dadddf;
  color: #69727b;
  font-size: 11px;
}
.zoom-chip {
  background: #fff;
  border: 1px solid #dfe2e5;
  padding: 5px 9px;
  border-radius: 5px;
}
.workspace-stage {
  position: relative;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 28px;
  overflow: hidden;
  background-color: #e5e7ea;
  background-image: radial-gradient(#c9cdd1 0.8px, transparent 0.8px);
  background-size: 18px 18px;
}
.workspace-stage.checkerboard {
  background-color: #ebedef;
  background-image:
    linear-gradient(45deg, #d6d9dd 25%, transparent 25%),
    linear-gradient(-45deg, #d6d9dd 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #d6d9dd 75%),
    linear-gradient(-45deg, transparent 75%, #d6d9dd 75%);
  background-size: 24px 24px;
  background-position:
    0 0,
    0 12px,
    12px -12px,
    -12px 0;
}
.workspace-stage canvas {
  display: block;
  max-width: 100%;
  max-height: 100%;
  box-shadow: 0 12px 40px rgba(36, 43, 50, 0.22);
  touch-action: none;
}
.workspace-stage canvas:not(.result-canvas) {
  cursor: crosshair;
}
.workspace-empty {
  width: min(680px, 80%);
  height: min(480px, 72%);
  border: 1px dashed #bbc1c7;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.65);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #394049;
  cursor: pointer;
}
.empty-image-icon {
  width: 62px;
  height: 52px;
  border: 2px solid #c7ccd1;
  border-radius: 8px;
  display: grid;
  place-items: center;
  margin-bottom: 20px;
}
.empty-image-icon i {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #ff8124;
  color: #fff;
  display: grid;
  place-items: center;
  font-style: normal;
  font-size: 20px;
}
.workspace-empty strong {
  font-size: 16px;
}
.workspace-empty small {
  color: #8b939b;
  margin: 8px 0 18px;
}
.workspace-empty b {
  background: #ff8124;
  color: #fff;
  padding: 10px 20px;
  border-radius: 7px;
  font-size: 12px;
}
.workspace-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  background: #f8f9fa;
  border-top: 1px solid #dadddf;
  color: #959ca4;
  font-size: 9px;
}
.visually-hidden {
  position: absolute !important;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}
.history-actions button:not(:disabled) {
  color: #545c65;
  cursor: pointer;
}
.category-tool-list {
  display: grid;
  gap: 7px;
  margin-bottom: 18px;
}
.category-tool-list button {
  min-height: 58px;
  border: 1px solid #e3e6e9;
  border-radius: 8px;
  background: #fafbfc;
  color: #616a73;
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr) auto;
  align-items: center;
  gap: 9px;
  padding: 8px 10px;
  text-align: left;
  cursor: pointer;
}
.category-tool-list button > span:first-child {
  font-size: 18px;
  text-align: center;
}
.category-tool-list .tool-copy {
  min-width: 0;
  display: grid;
  gap: 3px;
}
.category-tool-list b {
  font-size: 11px;
}
.category-tool-list small {
  overflow: hidden;
  color: #9299a1;
  font-size: 8px;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.category-tool-list i {
  color: #a8afb6;
  font-style: normal;
}
.category-tool-list button.active {
  border-color: #ff9d59;
  background: #fff3e9;
  color: #d95f0b;
}
.category-tool-list button:disabled {
  background: #f5f6f7;
  color: #b6bcc2;
  cursor: not-allowed;
}
.category-tool-list button:disabled small {
  color: #b6bcc2;
}
.operation-panel {
  display: grid;
  gap: 10px;
}
.output-settings {
  display: grid;
  gap: 10px;
}
.output-settings label {
  display: grid;
  grid-template-columns: 58px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  color: #66707a;
  font-size: 11px;
}
.output-settings select {
  min-width: 0;
  border: 1px solid #d9dde1;
  border-radius: 6px;
  padding: 8px;
  background: #fff;
  color: #394049;
}
.output-settings .checkbox-setting {
  display: flex;
  cursor: pointer;
}
.output-settings p {
  margin: 0;
  color: #9299a1;
  font-size: 9px;
  line-height: 1.45;
}
.operation-panel > p {
  margin: 0;
  color: #818992;
  font-size: 10px;
}
.operation-panel label {
  display: grid;
  grid-template-columns: 52px 1fr auto;
  align-items: center;
  gap: 7px;
  color: #66707a;
  font-size: 11px;
}
.operation-panel input[type="number"],
.operation-panel select,
.export-form input[type="number"],
.export-form select {
  min-width: 0;
  border: 1px solid #d9dde1;
  border-radius: 6px;
  padding: 8px;
  background: #fff;
  color: #394049;
  color-scheme: light;
}
.resize-presets {
  display: grid;
}
.resize-presets button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid #dfe3e7;
  border-radius: 7px;
  padding: 9px;
  background: #fff;
  color: #535c65;
  cursor: pointer;
}
.resize-presets strong {
  color: #252a30;
  font-size: 10px;
}
.ratio-grid,
.operation-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 7px;
}
.ratio-grid button,
.operation-grid button {
  border: 1px solid #dfe3e7;
  background: #fff;
  border-radius: 7px;
  padding: 9px;
  color: #535c65;
  cursor: pointer;
}
.ratio-grid button.active {
  border-color: #ff8124;
  background: #fff5ed;
  color: #d85d09;
  box-shadow: inset 0 0 0 1px #ff8124;
}
.operation-grid button {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 18px;
}
.operation-grid small {
  font-size: 9px;
}
.primary-operation {
  border: 0;
  border-radius: 7px;
  background: #252a30;
  color: #fff;
  padding: 10px;
  cursor: pointer;
}
.primary-operation:disabled {
  opacity: 0.4;
}
.workspace-stage {
  position: relative;
}
.workspace-stage.panning,
.workspace-stage.panning canvas {
  cursor: grabbing !important;
}
.workspace-stage canvas {
  transform-origin: center;
  transition: transform 0.12s ease;
}
.canvas-zoom-controls {
  position: absolute;
  right: 18px;
  bottom: 18px;
  z-index: 3;
  display: flex;
  align-items: center;
  padding: 4px;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(205, 210, 215, 0.9);
  border-radius: 9px;
  box-shadow: 0 8px 24px rgba(34, 41, 48, 0.16);
  backdrop-filter: blur(8px);
}
.canvas-zoom-controls button {
  height: 30px;
  min-width: 32px;
  border: 0;
  background: transparent;
  color: #4f5861;
  border-radius: 6px;
  font-weight: 700;
  cursor: pointer;
}
.canvas-zoom-controls button:hover:not(:disabled) {
  background: #fff0e6;
  color: #df650f;
}
.canvas-zoom-controls button:disabled {
  color: #c2c7cc;
  cursor: not-allowed;
}
.canvas-zoom-controls .zoom-value {
  min-width: 54px;
  font-size: 11px;
  border-left: 1px solid #eceef0;
  border-right: 1px solid #eceef0;
  border-radius: 0;
}
.canvas-zoom-controls .fit-button {
  min-width: 44px;
  margin-left: 3px;
  font-size: 10px;
}
.export-form {
  display: grid;
  gap: 16px;
}
.export-form > label {
  display: grid;
  grid-template-columns: 60px 1fr auto;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}
.export-size {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 8px;
  align-items: end;
}
.export-size label {
  display: grid;
  gap: 5px;
  color: #68717a;
  font-size: 10px;
}
.export-form p {
  margin: 0;
  color: #818992;
  font-size: 10px;
}
.export-confirm {
  border: 0;
  border-radius: 8px;
  background: #ff8124;
  color: #fff;
  padding: 11px;
  font-weight: 700;
  cursor: pointer;
}
.cutout-studio {
  margin-top: 12px;
  border: 1px solid #e1e4e7;
  border-radius: 10px;
  overflow: hidden;
  background: #fafbfc;
}
.effect-tabs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  padding: 4px;
  border-bottom: 1px solid #e4e7ea;
  background: #f1f3f5;
}
.effect-tabs button {
  border: 0;
  background: transparent;
  padding: 8px 4px;
  border-radius: 6px;
  color: #747d86;
  font-size: 10px;
  cursor: pointer;
}
.effect-tabs button.active {
  background: #fff;
  color: #e8640c;
  box-shadow: 0 1px 5px rgba(35, 42, 49, 0.1);
  font-weight: 700;
}
.effect-panel {
  display: grid;
  gap: 11px;
  padding: 12px;
}
.effect-panel label {
  display: grid;
  grid-template-columns: 62px minmax(0, 1fr) auto;
  align-items: center;
  gap: 7px;
  color: #68717a;
  font-size: 10px;
}
.effect-panel input[type="range"] {
  width: 100%;
  accent-color: #ff8124;
}
.effect-panel input[type="color"] {
  width: 36px;
  height: 28px;
  padding: 2px;
  border: 1px solid #d9dde1;
  border-radius: 5px;
  background: #fff;
}
.effect-panel select {
  border: 1px solid #d9dde1;
  border-radius: 6px;
  background: #fff;
  padding: 7px;
}
.effect-panel output {
  min-width: 38px;
  color: #e8640c;
  text-align: right;
}
.effect-panel p {
  margin: 0;
  color: #9299a1;
  font-size: 9px;
  line-height: 1.5;
}
.background-types {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
}
.background-types {
  grid-template-columns: repeat(4, 1fr);
}
.background-types button,
.upload-background {
  border: 1px solid #dfe3e7;
  background: #fff;
  border-radius: 6px;
  padding: 8px 4px;
  color: #68717a;
  font-size: 10px;
  cursor: pointer;
}
.background-types button.active {
  border-color: #ff9d59;
  background: #fff0e6;
  color: #d95f0b;
}
.background-fill-modes {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
}
.background-fill-modes button {
  border: 1px solid #dfe3e7;
  background: #fff;
  border-radius: 6px;
  padding: 8px 4px;
  color: #68717a;
  font-size: 10px;
  cursor: pointer;
}
.background-fill-modes button.active {
  border-color: #ff9d59;
  background: #fff0e6;
  color: #d95f0b;
}
.upload-background {
  width: 100%;
  color: #d95f0b;
}
.result-canvas.refining {
  cursor: none;
}
.brush-cursor {
  position: absolute;
  z-index: 2;
  box-sizing: border-box;
  border: 1.5px solid #fff;
  border-radius: 50%;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.85), 0 1px 4px rgba(0, 0, 0, 0.5);
  transform: translate(-50%, -50%);
  pointer-events: none;
}
@media (max-width: 850px) {
  .editor-body {
    grid-template-columns: 64px 250px minmax(0, 1fr) var(--history-panel-width);
  }
  .tool-panel {
    padding: 17px 13px;
  }
  .topbar-filename,
  .history-actions,
  .topbar-local {
    display: none;
  }
  .workspace-footer span:last-child {
    display: none;
  }
}
@media (max-width: 620px) {
  .image-editor {
    min-height: 560px;
  }
  .editor-body {
    grid-template-columns: 58px minmax(0, 1fr);
  }
  .history-panel-shell {
    display: none;
  }
  .tool-panel {
    position: absolute;
    left: 58px;
    top: 58px;
    bottom: 0;
    width: 250px;
    transform: translateX(-100%);
    display: none;
  }
  .tool-rail {
    z-index: 4;
  }
  .editor-brand > span:last-child {
    display: none;
  }
  .editor-topbar {
    gap: 8px;
    padding: 0 10px;
  }
  .topbar-download {
    margin-left: auto;
  }
  .workspace-stage {
    padding: 12px;
  }
}
</style>
