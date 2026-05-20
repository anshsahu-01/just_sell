import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, router } from "expo-router";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { CartButton } from "@/components/CartButton";
import { LoadingState } from "@/components/LoadingState";
import { MyListingCard } from "@/components/MyListingCard";
import { ProductCard } from "@/components/ProductCard";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useAuth } from "@/hooks/useAuth";
import * as productService from "@/services/product.service";
import { ApiError } from "@/services/api";
import { Product, Order } from "@/types";
import { useFavoritesStore } from "@/store/favoritesStore";
import * as orderService from "@/services/order.service";
import { OrderCard } from "@/components/OrderCard";
import { deleteAccount as deleteAccountApi } from "@/services/user.service";

export default function ProfileScreen() {
  const { user, token, logout } = useAuth();
  const favoriteProducts = useFavoritesStore((state) => state.products);
  const [active, setActive] = useState<Product[]>([]);
  const [sold, setSold] = useState<Product[]>([]);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [mySales, setMySales] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Delete account modal state
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  const isDeletedUser = user?.name === "Deleted User";

  const initials = useMemo(() => {
    const name = user?.name?.trim() ?? "";
    if (!name || isDeletedUser) return "?";
    return name
      .split(" ")
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");
  }, [user?.name, isDeletedUser]);

  const loadListings = useCallback(
    async (isRefresh = false) => {
      if (!token) return;
      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        const [productsData, ordersData, salesData] = await Promise.all([
          productService.getMyProducts(token),
          orderService.getMyOrders(token),
          orderService.getMySales(token),
        ]);

        setActive(productsData.active);
        setSold(productsData.sold);
        setMyOrders(ordersData);
        setMySales(salesData);
      } catch {
        setActive([]);
        setSold([]);
        setMyOrders([]);
        setMySales([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token]
  );

  useFocusEffect(
    useCallback(() => {
      loadListings();
    }, [loadListings])
  );

  const handleMarkSold = async (productId: string) => {
    if (!token) return;
    try {
      await productService.updateProductStatus(productId, "SOLD", token);
      await loadListings(true);
    } catch (err) {
      Alert.alert(
        "Failed",
        err instanceof ApiError ? err.message : "Could not update status"
      );
    }
  };

  const handleDelete = async (productId: string) => {
    if (!token) return;
    try {
      await productService.deleteProduct(productId, token);
      await loadListings(true);
    } catch (err) {
      Alert.alert(
        "Failed",
        err instanceof ApiError ? err.message : "Could not delete listing"
      );
    }
  };

  const handleUpdateOrderStatus = async (
    orderId: string,
    status: "confirmed" | "cancelled"
  ) => {
    if (!token) return;
    try {
      setActionLoading(true);
      await orderService.updateOrderStatus(orderId, status, token);
      await loadListings(true);
    } catch (err) {
      Alert.alert(
        "Failed",
        err instanceof ApiError ? err.message : "Could not update order status"
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!token) return;
    setDeleteLoading(true);
    try {
      await deleteAccountApi({ confirmation: "DELETE" }, token);
      setDeleteModalVisible(false);
      setDeleteConfirmText("");
      await logout();
      router.dismissAll();
      router.replace("/(auth)/login");
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof ApiError ? err.message : "Could not delete account. Please try again."
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  const openDeleteModal = () => {
    setDeleteConfirmText("");
    setDeleteModalVisible(true);
  };

  if (loading) {
    return <LoadingState />;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScreenHeader title="Profile" rightAction={<CartButton />} />

      <ScrollView
        style={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadListings(true)} />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Profile card ── */}
        <View style={styles.profileCard}>
          {user?.profileImage ? (
            <Image
              source={{ uri: user.profileImage }}
              style={styles.avatar}
              contentFit="cover"
            />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
          )}

          <Text style={styles.userName}>{isDeletedUser ? "Deleted User" : user?.name}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>

          {!isDeletedUser && user?.collegeName ? (
            <Text style={styles.userMeta}>{user.collegeName}</Text>
          ) : null}

          {!isDeletedUser && user?.mobileNumber ? (
            <Text style={styles.userMeta}>{user.mobileNumber}</Text>
          ) : null}

          {!isDeletedUser && user?.bio ? (
            <Text style={styles.userBio}>{user.bio}</Text>
          ) : null}

          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedText}>
              {user?.isVerified ? "✓ Verified account" : "Standard account"}
            </Text>
          </View>

          {/* ── Edit Profile + Delete Account buttons ── */}
          {!isDeletedUser && (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.editBtn}
                activeOpacity={0.75}
                onPress={() => router.push("/profile/edit-profile")}
              >
                <Ionicons name="pencil-outline" size={15} color="#ffffff" />
                <Text style={styles.editBtnText}>Edit Profile</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteBtn}
                activeOpacity={0.75}
                onPress={openDeleteModal}
              >
                <Ionicons name="trash-outline" size={15} color="#C0392B" />
                <Text style={styles.deleteBtnText}>Delete Account</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── Stats ── */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Active</Text>
            <Text style={styles.statValue}>{active.length}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Sold</Text>
            <Text style={styles.statValue}>{sold.length}</Text>
          </View>
        </View>

        {/* ── Summary list ── */}
        <View style={styles.summaryCard}>
          {[
            { icon: "bag-handle-outline", title: "My listings", value: `${active.length} active` },
            { icon: "archive-outline", title: "Sold archive", value: `${sold.length} sold` },
            { icon: "heart-outline", title: "Favourites", value: `${favoriteProducts.length} saved` },
            { icon: "cart-outline", title: "My orders", value: `${myOrders.length} orders` },
            { icon: "cash-outline", title: "My sales", value: `${mySales.length} sales` },
          ].map((item, index, arr) => (
            <View key={item.title}>
              <View style={styles.summaryRow}>
                <Ionicons name={item.icon as never} size={18} color="#111111" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.summaryTitle}>{item.title}</Text>
                  <Text style={styles.summaryValue}>{item.value}</Text>
                </View>
              </View>
              {index < arr.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>

        {/* ── My listings ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My listings</Text>
          <View style={styles.listCard}>
            <Text style={styles.listHeader}>Active ({active.length})</Text>
            {active.length === 0 ? (
              <Text style={styles.emptyText}>No active listings</Text>
            ) : (
              active.map((product) => (
                <MyListingCard
                  key={product.id}
                  product={product}
                  onEdit={() => router.push(`/product/edit/${product.id}`)}
                  showMarkSold
                  onMarkSold={() => handleMarkSold(product.id)}
                  onDelete={() => handleDelete(product.id)}
                />
              ))
            )}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.listCard}>
            <Text style={styles.listHeader}>Sold ({sold.length})</Text>
            {sold.length === 0 ? (
              <Text style={styles.emptyText}>No sold listings</Text>
            ) : (
              sold.map((product) => (
                <MyListingCard
                  key={product.id}
                  product={product}
                  onEdit={() => router.push(`/product/edit/${product.id}`)}
                  showMarkSold={false}
                  onDelete={() => handleDelete(product.id)}
                />
              ))
            )}
          </View>
        </View>

        {/* ── Orders ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My orders</Text>
          <View style={styles.listCard}>
            {myOrders.length === 0 ? (
              <Text style={styles.emptyText}>No orders yet</Text>
            ) : (
              myOrders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))
            )}
          </View>
        </View>

        {/* ── Sales ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sales</Text>
          <View style={styles.listCard}>
            {mySales.length === 0 ? (
              <Text style={styles.emptyText}>No sales yet</Text>
            ) : (
              mySales.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  isSeller
                  loading={actionLoading}
                  onConfirm={() => handleUpdateOrderStatus(order.id, "confirmed")}
                  onCancel={() => handleUpdateOrderStatus(order.id, "cancelled")}
                />
              ))
            )}
          </View>
        </View>

        {/* ── Favourites ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Favourites</Text>
          {favoriteProducts.length === 0 ? (
            <View style={styles.listCard}>
              <Text style={styles.emptyText}>No favourites yet.</Text>
            </View>
          ) : (
            <View style={styles.favGrid}>
              {favoriteProducts.map((product, index) => (
                <View
                  key={product.id}
                  style={[styles.favItem, index % 2 === 0 && { marginRight: 12 }]}
                >
                  <ProductCard product={product} />
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ── Log out ── */}
        <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.75}>
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ── Delete Account Modal ── */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Delete Account</Text>
            <Text style={styles.modalBody}>
              This action is permanent and cannot be undone. All your listings and data
              will be removed.{"\n\n"}Type{" "}
              <Text style={{ fontWeight: "700" }}>DELETE</Text> below to confirm.
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="DELETE"
              autoCapitalize="characters"
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              editable={!deleteLoading}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setDeleteModalVisible(false);
                  setDeleteConfirmText("");
                }}
                disabled={deleteLoading}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.confirmDeleteBtn,
                  deleteConfirmText !== "DELETE" && styles.confirmDeleteBtnDisabled,
                ]}
                onPress={handleDeleteAccount}
                disabled={deleteConfirmText !== "DELETE" || deleteLoading}
              >
                <Text style={styles.confirmDeleteText}>
                  {deleteLoading ? "Deleting…" : "Confirm Delete"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FAFAF8" },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },

  // Profile card
  profileCard: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ECE7DE",
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#ECE7DE",
  },
  avatarFallback: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#ECE7DE",
    backgroundColor: "#F0EDE8",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: { fontSize: 24, fontWeight: "600", color: "#1A1A1A" },
  userName: { fontSize: 22, fontWeight: "600", color: "#1A1A1A" },
  userEmail: { fontSize: 14, color: "#A6A09A", marginTop: 2 },
  userMeta: { fontSize: 13, color: "#A6A09A", marginTop: 2 },
  userBio: { fontSize: 13, color: "#6B6560", marginTop: 6, textAlign: "center" },
  verifiedBadge: {
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#ECE7DE",
  },
  verifiedText: { fontSize: 13, color: "#A6A09A" },

  // Action row (Edit + Delete buttons)
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
    width: "100%",
  },
  editBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#1A1A1A",
    borderRadius: 12,
    paddingVertical: 11,
  },
  editBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  deleteBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  deleteBtnText: { color: "#C0392B", fontSize: 14, fontWeight: "600" },

  // Stats
  statsRow: { flexDirection: "row", gap: 12, marginTop: 12 },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ECE7DE",
    padding: 16,
  },
  statLabel: { fontSize: 13, color: "#A6A09A" },
  statValue: { fontSize: 24, fontWeight: "600", color: "#1A1A1A", marginTop: 6 },

  // Summary list
  summaryCard: {
    marginTop: 12,
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ECE7DE",
  },
  summaryRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  summaryTitle: { fontSize: 15, fontWeight: "500", color: "#1A1A1A" },
  summaryValue: { fontSize: 13, color: "#A6A09A", marginTop: 2 },
  divider: { height: 1, backgroundColor: "#ECE7DE", marginHorizontal: 16 },

  // Sections
  section: { marginTop: 16 },
  sectionTitle: { fontSize: 18, fontWeight: "600", color: "#1A1A1A", marginBottom: 10 },
  listCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ECE7DE",
    overflow: "hidden",
  },
  listHeader: {
    fontSize: 13,
    fontWeight: "500",
    color: "#A6A09A",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#ECE7DE",
  },
  emptyText: { fontSize: 14, color: "#A6A09A", padding: 20 },

  // Favourites grid
  favGrid: { flexDirection: "row", flexWrap: "wrap" },
  favItem: { width: "48%", marginBottom: 12 },

  // Logout
  logoutBtn: {
    marginTop: 16,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ECE7DE",
    backgroundColor: "#fff",
  },
  logoutText: { fontSize: 15, fontWeight: "500", color: "#C0392B" },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
  },
  modalTitle: { fontSize: 20, fontWeight: "700", color: "#1A1A1A", marginBottom: 10 },
  modalBody: { fontSize: 14, color: "#6B6560", lineHeight: 22, marginBottom: 16 },
  modalInput: {
    borderWidth: 1,
    borderColor: "#ECE7DE",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: "#1A1A1A",
    marginBottom: 16,
  },
  modalActions: { flexDirection: "row", gap: 10 },
  cancelBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ECE7DE",
    backgroundColor: "#FAFAF8",
  },
  cancelText: { fontSize: 14, fontWeight: "500", color: "#6B6560" },
  confirmDeleteBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#C0392B",
  },
  confirmDeleteBtnDisabled: { backgroundColor: "#F5A29A" },
  confirmDeleteText: { fontSize: 14, fontWeight: "600", color: "#fff" },
});
